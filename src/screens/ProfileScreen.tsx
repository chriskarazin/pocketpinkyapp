import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  TouchableOpacity, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { moderateScale, responsiveFontSize } from '../theme/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PageHeader, Toast } from '../components';
import { supabase } from '../services/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileRow {
  id: string;
  full_name?: string;
  plan?: string;
  subscription_status?: string;
  subscription_end?: string;
  created_at?: string;
  message_credits?: number;
  credits_used?: number;
  total_messages?: number;
  daily_message_count?: number;
  last_message_at?: string;
  last_sign_in?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLAN_NAMES: Record<string, string> = {
  free: 'Free Trial',
  'user-500': '500 Message Pack',
  'user-1000': '1000 Message Pack',
  premium: 'Premium Monthly',
  ultra_premium: 'Ultra Premium',
};

// Always format dates in Gregorian en-US to avoid Hijri calendar on Arabic-locale devices
function fmtDate(iso?: string) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatus(profile: ProfileRow | null): { text: string; color: string } {
  const plan = profile?.plan ?? 'free';
  if (plan === 'ultra_premium') return { text: 'Lifetime', color: colors.gold };
  if (profile?.subscription_status === 'canceled') return { text: 'Canceled', color: '#F97316' };
  if (profile?.subscription_end && new Date() > new Date(profile.subscription_end))
    return { text: 'Expired', color: '#EF4444' };
  if (plan === 'free') {
    const trialEnd = profile?.created_at ? new Date(profile.created_at) : null;
    if (trialEnd) {
      trialEnd.setDate(trialEnd.getDate() + 7);
      const days = Math.ceil((trialEnd.getTime() - Date.now()) / 86400000);
      if (days <= 0) return { text: 'Trial Expired', color: '#EF4444' };
      return { text: `${days} days left`, color: '#3B82F6' };
    }
    return { text: 'Free Trial', color: '#3B82F6' };
  }
  return { text: 'Active', color: '#10B981' };
}

// ─── Row helper (list item) ────────────────────────────────────────────────────
interface RowProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  value?: string;
  isLast?: boolean;
  onPress?: () => void;
  danger?: boolean;
}

function Row({ icon, iconColor, iconBg, label, value, isLast, onPress, danger }: RowProps) {
  const Inner = (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={15} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: colors.pinkDeep }]}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      ) : onPress ? (
        <Feather name="chevron-right" size={16} color={colors.border} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {Inner}
      </TouchableOpacity>
    );
  }
  return Inner;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '', type: 'success', visible: false,
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      setEmail(user.email || '');
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      setProfile(data ? (data as ProfileRow) : { id: user.id });
      setIsLoading(false);

      channel = supabase
        .channel(`profile-${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload: any) => setProfile(prev => ({ ...(prev ?? { id: user.id }), ...payload.new })))
        .subscribe();
    };

    setup();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const handleUpgrade = () => {
    const url = (process.env.EXPO_PUBLIC_VETTING_APP_URL ?? '') + '/#pricing';
    Linking.openURL(url);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.pinkAccent} />
      </View>
    );
  }

  // Computed values
  const plan = profile?.plan ?? 'free';
  const isPremium = plan.includes('premium') || plan.includes('user-');
  const isUltra = plan === 'ultra_premium';
  const dailyLimit = isUltra ? '∞' : isPremium ? '20' : '10';
  const dailyUsed = profile?.daily_message_count ?? 0;
  const creditsRemaining = profile?.message_credits != null
    ? Math.max(0, profile.message_credits - (profile.credits_used ?? 0))
    : 0;
  const totalMsgs = profile?.total_messages ?? 0;
  const activeDays = profile?.created_at
    ? Math.max(1, Math.ceil((Date.now() - new Date(profile.created_at).getTime()) / 86400000))
    : 1;
  const displayName = profile?.full_name ?? 'Pink Pill Queen';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const status = getStatus(profile);
  const memberYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear();

  return (
    <View style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type}
        onHide={() => setToast(p => ({ ...p, visible: false }))} />

      <PageHeader leftIcon="menu" onLeftPress={() => (navigation as any).openDrawer()} />

      <ScrollView
        contentContainerStyle={[styles.content, {
          paddingTop: insets.top + moderateScale(72),
          paddingBottom: insets.bottom + moderateScale(32),
        }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profile Hero ─────────────────────────────────────────── */}
        <View style={styles.hero}>
          <LinearGradient colors={colors.gradients.primary as any} style={styles.heroAvatar}>
            <Text style={styles.heroInitials}>{initials}</Text>
          </LinearGradient>

          <Text style={styles.heroName}>{displayName}</Text>
          <Text style={styles.heroEmail}>{email}</Text>

          <View style={styles.heroBadgeRow}>
            <View style={[styles.heroBadge, { borderColor: status.color + '50', backgroundColor: status.color + '12' }]}>
              <View style={[styles.heroBadgeDot, { backgroundColor: status.color }]} />
              <Text style={[styles.heroBadgeText, { color: status.color }]}>{status.text}</Text>
            </View>
            <View style={styles.heroBadge}>
              <Feather name="shield" size={10} color={colors.gold} />
              <Text style={[styles.heroBadgeText, { color: colors.gold }]}>Since {memberYear}</Text>
            </View>
          </View>
        </View>

        {/* ── Stats Strip ──────────────────────────────────────────── */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Daily', value: `${dailyUsed}/${dailyLimit}`, icon: 'zap', color: '#F59E0B' },
            { label: 'Credits', value: String(creditsRemaining), icon: 'credit-card', color: colors.pinkAccent },
            { label: 'Msgs', value: String(totalMsgs), icon: 'message-circle', color: '#3B82F6' },
            { label: 'Days', value: String(activeDays), icon: 'activity', color: '#10B981' },
          ].map((s, i, arr) => (
            <View key={i} style={[styles.statCell, i < arr.length - 1 && styles.statCellBorder]}>
              <Feather name={s.icon as any} size={14} color={s.color} style={{ marginBottom: 6 }} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Subscription ─────────────────────────────────────────── */}
        <Text style={styles.groupLabel}>SUBSCRIPTION</Text>
        <View style={styles.group}>
          <Row
            icon="shield"
            iconColor={colors.gold}
            iconBg={colors.goldPale}
            label={PLAN_NAMES[plan] ?? 'Free Trial'}
            value={status.text}
            isLast={isPremium}
          />
          {!isPremium && (
            <Row
              icon="zap"
              iconColor="#fff"
              iconBg={colors.pinkAccent}
              label="Upgrade to Premium"
              isLast
              onPress={handleUpgrade}
            />
          )}
        </View>

        {/* ── Account Info ─────────────────────────────────────────── */}
        <Text style={styles.groupLabel}>ACCOUNT</Text>
        <View style={styles.group}>
          <Row
            icon="user"
            iconColor={colors.pinkAccent}
            iconBg={colors.accentLight}
            label="Name"
            value={displayName}
          />
          <Row
            icon="mail"
            iconColor="#3B82F6"
            iconBg="#EFF6FF"
            label="Email"
            value={email}
          />
          <Row
            icon="message-circle"
            iconColor="#10B981"
            iconBg="#ECFDF5"
            label="Last Message"
            value={profile?.last_message_at ? fmtDate(profile.last_message_at) : 'None yet'}
            isLast
          />
        </View>

        {/* ── Support & Legal ──────────────────────────────────────── */}
        <Text style={styles.groupLabel}>SUPPORT & LEGAL</Text>
        <View style={styles.group}>
          <Row icon="file-text" iconColor={colors.textMuted} iconBg={colors.creamDark} label="Terms of Service"
            onPress={() => Linking.openURL((process.env.EXPO_PUBLIC_VETTING_APP_URL ?? '') + '/terms')} />
          <Row icon="lock" iconColor={colors.textMuted} iconBg={colors.creamDark} label="Privacy Policy"
            onPress={() => Linking.openURL((process.env.EXPO_PUBLIC_VETTING_APP_URL ?? '') + '/privacy')} />
          <Row icon="help-circle" iconColor={colors.textMuted} iconBg={colors.creamDark} label="Help & Support"
            isLast
            onPress={() => Linking.openURL((process.env.EXPO_PUBLIC_VETTING_APP_URL ?? '') + '/contact')} />
        </View>

        {/* ── Danger Zone ──────────────────────────────────────────── */}
        <View style={styles.group}>
          <Row
            icon="log-out"
            iconColor={colors.pinkDeep}
            iconBg="#FEF2F2"
            label="Sign Out"
            isLast
            onPress={handleLogout}
            danger
          />
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' }, // System-grey bg like iOS Settings
  content: { paddingHorizontal: spacing.lg },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.pinkDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  heroInitials: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: '#fff',
  },
  heroName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: responsiveFontSize(22),
    color: colors.textPrimary,
    marginBottom: 4,
  },
  heroEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },

  // ── Stats strip ──
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statCellBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: responsiveFontSize(16),
    color: colors.textPrimary,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  // ── Grouped sections (iOS Settings style) ──
  groupLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  group: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
    overflow: 'hidden',
  },

  // ── Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    gap: 13,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.textPrimary,
  },
  rowValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.textMuted,
    maxWidth: '45%',
    textAlign: 'right',
  },
});
