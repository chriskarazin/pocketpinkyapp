import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { PageHeader, Toast } from '../components';
import { supabase } from '../services/supabase';
import { botpress, Message } from '../services/botpress';
import { checkSubscriptionTier } from '../services/subscriptionCheck';
import { colors, spacing, typography } from '../theme';
import { moderateScale, responsiveFontSize } from '../theme/responsive';

const HEADER_CONTENT_HEIGHT = moderateScale(56);
const LOGO = require('../../assets/pinky.png');

const TypingDots = () => {
  const [dots] = useState([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    Animated.parallel(animations).start();
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.dotsContainer}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
              transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const renderTextWithLinks = (text: string, isUser: boolean) => {
  if (!text) return '';

  // Regex to match URLs starting with http:// or https://
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <Text
          key={index}
          style={[
            styles.linkText,
            isUser ? styles.userLinkText : styles.botLinkText
          ]}
          onPress={() => Linking.openURL(part)}
        >
          {part}
        </Text>
      );
    }
    return part;
  });
};

export function ChatScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const isInitializedRef = useRef(false);
  const activeConvoIdRef = useRef<string | null>(null);
  const botpressUserIdRef = useRef<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [botpressUserId, setBotpressUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('free');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '', type: 'success', visible: false,
  });

  useEffect(() => {
    botpressUserIdRef.current = botpressUserId;
  }, [botpressUserId]);
  useEffect(() => {
    const convoId = route.params?.conversationId;
    if (!isInitialLoad) {
      if (convoId) {
        botpress.setConversationId(convoId);
        refreshMessages();
      } else {
        startNewChat();
      }
    }
  }, [route.params?.conversationId, route.params?.timestamp]);

  useEffect(() => {
    initChat();
    return () => {
      botpress.closeSSE();
    };
  }, []);

  const [extraBottomPad, setExtraBottomPad] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setExtraBottomPad(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setExtraBottomPad(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages.length, isBotTyping]);

  const refreshMessages = async () => {
    setIsLoading(true);
    await fetchMessages();
    await startListening();
    setIsLoading(false);
  };

  const startNewChat = async () => {
    setIsLoading(true);
    setMessages([]);
    setIsBotTyping(false);
    botpress.closeSSE();
    await botpress.createConversation();
    await startListening();
    setIsLoading(false);
  };

  async function initChat(force: boolean = false) {
    if (isInitializedRef.current && !force) {
      return;
    }
    isInitializedRef.current = true;

    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUser(session.user);

      const { plan, messageCredits } = await checkSubscriptionTier(session.user.id);
      const normalizedPlan = plan?.toLowerCase();
      setSubscriptionPlan(normalizedPlan);

      const bpUser = await botpress.createUser(session.user.id, {
        email: session.user.email,
        name: session.user.user_metadata?.full_name || 'Queen',
        subscriptionTier: plan,
        messageCredits,
      });

      const internalId = bpUser?.botpressUserId;
      setBotpressUserId(internalId);
      botpressUserIdRef.current = internalId;

      const planMessage = normalizedPlan === 'ultra_premium'
        ? '💎 Ultra Premium Active'
        : normalizedPlan === 'premium'
          ? '✨ Premium Plan Active'
          : 'Free Trial Active';

      setToast({
        message: planMessage,
        type: 'success',
        visible: true,
      });
      await botpress.updateUser({
        name: session.user.user_metadata?.full_name || 'Queen',
        subscriptionTier: normalizedPlan,
        messageCredits,
      });

      const convoId = route.params?.conversationId;
      if (convoId) {
        botpress.setConversationId(convoId);
      } else {
        await botpress.getOrStartLastConversation();
      }
      await new Promise(res => setTimeout(res, 500));

      try {
        await botpress.sendEvent('trigger', {
          action: 'init',
          type: 'proactive',
          channel: 'web',
          payload: {
            user: {
              externalId: session.user.id,
              metadata: {
                email: session.user.email,
                name: session.user.user_metadata?.full_name || 'Queen',
                subscriptionTier: normalizedPlan,
                messageCredits: messageCredits || 0,
              }
            }
          },
          // Legacy support for the userdata path
          userdata: {
            userData: {
              externalId: session.user.id,
              email: session.user.email,
              subscriptionTier: normalizedPlan,
            }
          }
        });

        await botpress.sendEvent('trigger', {
          action: 'tier_sync',
          tier: normalizedPlan,
        });
      } catch (e: any) {
        console.warn('[ChatScreen] Context sync failed:', e.message);
      }

      await fetchMessages();
      await startListening();
      setIsInitialLoad(false);
    } catch (error: any) {
      console.error('[ChatScreen] Init Error:', error);
      isInitializedRef.current = false;
      setToast({ message: 'Failed to connect to chat', type: 'error', visible: true });
    } finally {
      setIsLoading(false);
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await botpress.listMessages();
      if (response?.messages) {
        const filtered = response.messages.filter((m: any) => {
          if (!m.payload) return false;
          if (m.payload.text?.startsWith('[SYSTEM_EVENT]')) return false;
          return m.payload.text || m.payload.type === 'choice' || m.payload.type === 'text';
        });
        setMessages(filtered.reverse());
      }
    } catch (error) {
      console.error('[ChatScreen] Fetch Messages Error:', error);
    }
  };

  const startListening = useCallback(async () => {
    if (!botpress.getConversationId()) {
      await botpress.getOrStartLastConversation();
    }

    const currentId = botpress.getConversationId();
    // Compare against the ID we are actually listening to, not the SSE object
    if (activeConvoIdRef.current && activeConvoIdRef.current !== currentId) {
      botpress.closeSSE();
      activeConvoIdRef.current = null;
    }

    if (activeConvoIdRef.current) {
      return;
    }

    await botpress.listenForMessages(async (msg: any) => {
      activeConvoIdRef.current = currentId;
      console.log('[Chat] Incoming message through listener:', msg.direction, msg.payload?.text);

      if (msg._type === 'AUTH_ERROR') {
        isInitializedRef.current = false;
        await initChat();
        return;
      }

      if (msg.payload?.text?.startsWith('[SYSTEM_EVENT]')) return;

      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;

        if (msg.direction === 'incoming') {
          setIsBotTyping(false);
        }

        const hasTempMatch = msg.direction === 'outgoing' &&
          prev.some(m => m.id.startsWith('temp-') && m.payload.text === msg.payload?.text);

        if (hasTempMatch) {
          return prev.map(m =>
            (m.id.startsWith('temp-') && m.payload.text === msg.payload?.text) ? msg : m
          );
        }

        return [...prev, msg];
      });
    });
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    const currentConvoId = botpress.getConversationId();
    if (!currentConvoId) {
      setToast({ message: 'Chat is still connecting...', type: 'error', visible: true });
      return;
    }

    setInputText('');
    Keyboard.dismiss();

    const tempMsg: any = {
      id: `temp-${Date.now()}-${Math.random()}`,
      payload: { type: 'text', text },
      userId: botpressUserIdRef.current,
      direction: 'outgoing',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMsg]);
    setIsBotTyping(true);

    try {
      // Ensure listener is synced to current conversation before sending
      if (!botpress.isListeningTo(botpress.currentConversationId)) {
        console.log('[Chat] Resyncing listener before send...');
        await startListening();
      }

      await botpress.sendMessage(text);
    } catch (error: any) {
      try {
        await botpress.getOrStartLastConversation();
        await botpress.sendMessage(text);
      } catch (retryError: any) {
        setToast({ message: 'Message failed to send', type: 'error', visible: true });
        setIsBotTyping(false);
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      }
    }
  }, [inputText]);

  const handleChoiceSelect = useCallback(async (label: string) => {
    const tempMsg: any = {
      id: `temp-${Date.now()}-${Math.random()}`,
      payload: { type: 'text', text: label },
      userId: botpressUserIdRef.current,
      direction: 'outgoing',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMsg]);
    setIsBotTyping(true);

    try {
      await botpress.sendMessage(label);
    } catch (error) {
      setToast({ message: 'Failed to send choice', type: 'error', visible: true });
      setIsBotTyping(false);
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    }
  }, []);

  const renderMessage = useCallback(({ item }: { item: any }) => {
    if (item.payload?.text?.startsWith('[SYSTEM_EVENT]')) return null;

    const isUser = item.direction === 'outgoing';
    const isChoice = item.payload?.type === 'choice';

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
        <View style={isUser ? styles.userRowContent : styles.botRowContent}>
          <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
            <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
              {renderTextWithLinks(item.payload?.text || '', isUser)}
            </Text>
          </View>

          {isChoice && item.payload?.options && !isUser && (
            <View style={styles.choicesContainer}>
              {item.payload.options.map((option: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.choiceButton}
                  onPress={() => handleChoiceSelect(option.label)}
                >
                  <Text style={styles.choiceText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }, [handleChoiceSelect]);

  const renderFooter = useCallback(() =>
    isBotTyping ? (
      <View style={styles.typingWrapper}><TypingDots /></View>
    ) : <View style={{ height: spacing.sm }} />,
    [isBotTyping]
  );

  const renderWelcome = () => (
    <View style={[styles.welcomeContainer, { paddingTop: insets.top + HEADER_CONTENT_HEIGHT + spacing.xl }]}>
      <Image source={LOGO} style={styles.welcomeLogo} resizeMode="contain" />
      <Text style={styles.welcomeTitle}>
        Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || 'Queen'} ✨
      </Text>
      <Text style={styles.welcomeText}>How can I assist you today?</Text>
    </View>
  );

  const inputContainerPadding = Platform.OS === 'android' && extraBottomPad > 0
    ? 10
    : (insets.bottom || spacing.sm);

  return (
    <View style={styles.container}>
      <PageHeader
        title="Pink Pill Chat"
        leftIcon="menu"
        onLeftPress={() => navigation.openDrawer()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.flex}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading chat...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, index) => item.id || String(index)}
              contentContainerStyle={[styles.messagesList, { paddingTop: insets.top + HEADER_CONTENT_HEIGHT + spacing.md }]}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={renderWelcome}
              ListFooterComponent={renderFooter}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={Platform.OS === 'android'}
              windowSize={10}
              maxToRenderPerBatch={10}
              initialNumToRender={15}
            />
          )}
        </View>

        <View style={[styles.inputContainer, { paddingBottom: inputContainerPadding }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
            >
              <Feather name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  messageRow: { flexDirection: 'row', marginBottom: spacing.md, width: '100%' },
  userRow: { justifyContent: 'flex-end' },
  botRow: { justifyContent: 'flex-start' },
  userRowContent: { alignItems: 'flex-end', maxWidth: '85%', alignSelf: 'flex-end' },
  botRowContent: { alignItems: 'flex-start', maxWidth: '85%' },
  messageBubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  messageText: { fontSize: responsiveFontSize(14), lineHeight: 22, fontFamily: 'Inter_400Regular' },
  userText: { color: '#fff' },
  botText: { color: colors.textPrimary },
  linkText: {
    textDecorationLine: 'underline',
  },
  userLinkText: {
    color: '#fff',
    fontWeight: '600',
  },
  botLinkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  choicesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, gap: spacing.sm },
  choiceButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 16 },
  choiceText: { ...typography.bodySmall, color: colors.primary, fontFamily: 'Inter_600SemiBold' },
  inputContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: colors.border },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', borderRadius: 28, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border, minHeight: 52 },
  input: { flex: 1, maxHeight: 120, paddingTop: 12, paddingBottom: 12, paddingHorizontal: 8, fontFamily: 'Inter_400Regular', fontSize: 16, color: colors.textPrimary },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 6, marginLeft: 4 },
  sendButtonDisabled: { backgroundColor: colors.textMuted, opacity: 0.5 },
  typingWrapper: { paddingVertical: spacing.sm, alignSelf: 'flex-start' },
  dotsContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, elevation: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.caption, marginTop: spacing.sm, color: colors.textMuted },
  welcomeContainer: { flex: 1, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  welcomeLogo: { width: 80, height: 80, borderRadius: 40, marginBottom: spacing.lg, opacity: 0.85 },
  welcomeTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: responsiveFontSize(26), color: colors.primary, marginBottom: spacing.md, textAlign: 'center' },
  welcomeText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
});