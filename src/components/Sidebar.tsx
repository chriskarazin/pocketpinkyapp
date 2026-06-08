import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
} from 'react-native';
import { DrawerContentComponentProps, useDrawerStatus } from '@react-navigation/drawer';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, responsiveFontSize } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { botpress } from '../services/botpress';
import { checkSubscriptionTier } from '../services/subscriptionCheck';
import { ConfirmationModal } from './ConfirmationModal';
import { Toast } from './Toast';

const LOGO = require('../../assets/pinky.png');

export function Sidebar(props: DrawerContentComponentProps) {
    const insets = useSafeAreaInsets();
    const drawerStatus = useDrawerStatus();
    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        ensureInitAndFetch();
    }, []);
    useEffect(() => {
        if (drawerStatus === 'open') {
            setActiveId(botpress.getConversationId());
            fetchHistory();
        }
    }, [drawerStatus]);

    const ensureInitAndFetch = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { plan, messageCredits } = await checkSubscriptionTier(session.user.id);

            await botpress.createUser(session.user.id, {
                email: session.user.email,
                name: session.user.user_metadata?.full_name,
                subscriptionTier: plan,
                messageCredits,
            });

            await fetchHistory();
        } catch (error) {
            console.error('[Sidebar] Init Error:', error);
        }
    };

    const fetchHistory = async () => {
        try {
            setIsLoading(true);
            const response = await botpress.listConversations();
            if (response?.conversations) {
                const sorted = [...response.conversations].sort((a, b) => {
                    const da = a.updatedAt || a.createdAt || '';
                    const db = b.updatedAt || b.createdAt || '';
                    return db.localeCompare(da);
                });
                setConversations(sorted);
            }
        } catch (error) {
            console.error('[Sidebar] Fetch History Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await botpress.clearSession(session.user.id);
        }
        await supabase.auth.signOut();
    };

    const handleNewChat = useCallback(() => {
        props.navigation.navigate('Chat', { conversationId: null, timestamp: Date.now() });
        props.navigation.closeDrawer();
    }, [props.navigation]);

    const handleSelectChat = useCallback((id: string) => {
        setActiveId(id);
        props.navigation.navigate('Chat', { conversationId: id, timestamp: Date.now() });
        props.navigation.closeDrawer();
    }, [props.navigation]);

    const handleDeleteConversation = useCallback((id: string) => {
        setPendingDeleteId(id);
        setIsDeleteModalVisible(true);
    }, []);

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;
        const idToDelete = pendingDeleteId;
        setIsDeleteModalVisible(false);
        setPendingDeleteId(null);

        try {
            await botpress.deleteConversation(idToDelete);
            setConversations(prev => prev.filter(c => c.id !== idToDelete));
            setToast({ visible: true, message: 'Chat deleted', type: 'success' });

            if (idToDelete === activeId) {
                props.navigation.navigate('Chat', { conversationId: null, timestamp: Date.now() });
            }
        } catch (error) {
            console.error('[Sidebar] Delete Error:', error);
            setToast({ visible: true, message: 'Failed to delete chat', type: 'error' });
        }
    };

    const formatConvoLabel = (chat: any, index: number) => {
        const lastText = chat.lastMessage?.payload?.text;
        if (lastText && typeof lastText === 'string' && lastText.trim().length > 0) {
            if (lastText.startsWith('[SYSTEM_EVENT]')) {
                return 'System Update';
            }
            return lastText;
        }

        const date = chat.updatedAt || chat.createdAt;
        const created = date ? new Date(date) : null;
        if (created) {
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return 'Today\'s Chat';
            if (diffDays === 1) return 'Yesterday\'s Chat';
            if (diffDays < 7) return `${diffDays} days ago`;
            return created.toLocaleDateString();
        }
        return `Chat ${index + 1}`;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Image
                    source={LOGO}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat} activeOpacity={0.8}>
                    <Feather name="plus" size={16} color={colors.primary} />
                    <Text style={styles.newChatText}>New Chat</Text>
                </TouchableOpacity>
            </View>

            {/* Chat History */}
            <View style={styles.historyContainer}>
                <Text style={styles.sectionTitle}>CHAT HISTORY</Text>
                {isLoading && conversations.length === 0 ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.lg }} />
                ) : (
                    <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                        {conversations.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Feather name="message-square" size={28} color={colors.textMuted} />
                                <Text style={styles.emptyText}>No chat history yet</Text>
                                <Text style={styles.emptySubText}>Start a new conversation!</Text>
                            </View>
                        ) : (
                            conversations.map((chat, index) => {
                                const isActive = chat.id === activeId;
                                return (
                                    <View
                                        key={chat.id}
                                        style={[styles.historyItem, isActive && styles.activeHistoryItem]}
                                    >
                                        <TouchableOpacity
                                            style={styles.historyMainClick}
                                            onPress={() => handleSelectChat(chat.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Feather
                                                name="message-square"
                                                size={15}
                                                color={isActive ? colors.primary : colors.textMuted}
                                            />
                                            <View style={styles.historyTextContainer}>
                                                <Text
                                                    style={[styles.historyTitle, isActive && styles.activeHistoryTitle]}
                                                    numberOfLines={1}
                                                >
                                                    {formatConvoLabel(chat, index)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.deleteHistoryButton}
                                            onPress={() => handleDeleteConversation(chat.id)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Feather name="trash-2" size={13} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { props.navigation.navigate('Profile'); props.navigation.closeDrawer(); }}
                    activeOpacity={0.7}
                >
                    <Feather name="user" size={18} color={colors.textPrimary} />
                    <Text style={styles.menuItemText}>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
                    <Feather name="log-out" size={18} color={colors.pinkDeep} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </View>

            <ConfirmationModal
                visible={isDeleteModalVisible}
                title="Delete Chat"
                message="Are you sure you want to delete this conversation? This action cannot be undone."
                confirmText="Delete"
                onConfirm={confirmDelete}
                onCancel={() => { setIsDeleteModalVisible(false); setPendingDeleteId(null); }}
            />

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
    header: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        alignItems: 'center',
    },
    appName: {
        fontFamily: 'Allura_400Regular',
        fontSize: responsiveFontSize(32),
        color: colors.primary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xl,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primary,
        gap: 6,
        width: '100%',
    },
    newChatText: {
        ...typography.labelCaps,
        fontSize: 12,
        color: colors.primary,
        fontFamily: 'Inter_600SemiBold',
    },
    historyContainer: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    sectionTitle: {
        ...typography.labelCaps,
        fontSize: 10,
        color: colors.textMuted,
        letterSpacing: 1.5,
        marginBottom: spacing.sm,
    },
    historyList: { flex: 1 },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: spacing.xxl,
        gap: spacing.sm,
    },
    emptyText: {
        ...typography.body,
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
    emptySubText: {
        ...typography.bodySmall,
        color: colors.textMuted,
        opacity: 0.7,
        textAlign: 'center',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    activeHistoryItem: {
        backgroundColor: colors.accentLight,
        borderColor: colors.primary,
        borderWidth: 1.5,
    },
    historyMainClick: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
        gap: 8,
    },
    historyTextContainer: { flex: 1, marginLeft: 4 },
    historyTitle: {
        ...typography.body,
        fontSize: 13,
        color: colors.textPrimary,
        fontFamily: 'Inter_400Regular',
    },
    activeHistoryTitle: {
        color: colors.primary,
        fontFamily: 'Inter_600SemiBold',
    },
    deleteHistoryButton: {
        padding: spacing.sm,
        paddingRight: spacing.md,
    },
    footer: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.creamDark,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    menuItemText: {
        ...typography.labelCaps,
        fontSize: 13,
        color: colors.textPrimary,
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: spacing.md,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: spacing.xs,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    logoutText: {
        ...typography.labelCaps,
        fontSize: 13,
        color: colors.pinkDeep,
    },
});
