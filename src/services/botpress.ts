import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import EventSource from 'react-native-sse';

const BOT_ID = process.env.EXPO_PUBLIC_BOTPRESS_BOT_ID ?? 'bf1f3873-8b16-4876-8665-57c5912483c3';
const WEBHOOK_ID = process.env.EXPO_PUBLIC_BOTPRESS_WEBHOOK_ID ?? 'b5e3fae1-425e-406b-9cf8-749bf48076b8';
const API_URL = `https://chat.botpress.cloud/${WEBHOOK_ID}`;
const STORAGE_KEY_PREFIX = 'bp2_';
const REQUEST_TIMEOUT = 10000;

export interface Message {
    id: string;
    payload: { type: string; text: string;[key: string]: any };
    userId: string;
    conversationId: string;
    createdAt: string;
    direction: 'incoming' | 'outgoing';
}

export interface BotpressProfile {
    name?: string;
    email?: string;
    subscriptionTier?: string;
    messageCredits?: number;
}

export class BotpressService {
    private userToken: string | null = null;
    private conversationId: string | null = null;
    private botpressUserId: string | null = null;
    private externalId: string | null = null;
    private initPromise: Promise<any> | null = null;
    private lastProfile: Partial<BotpressProfile> | null = null;
    private activeSSE: any = null;
    private sseClosedIntentionally = false;

    private authHeaders() {
        return {
            'x-user-key': this.userToken!,
            'x-bot-id': BOT_ID,
            'Content-Type': 'application/json',
        };
    }

    getConversationId() { return this.conversationId; }
    getInternalUserId() { return this.botpressUserId; }

    get currentConversationId() {
        return this.conversationId;
    }

    isListeningTo(convoId: string | null) {
        if (!convoId || !this.activeSSE) return false;
        // In react-native-sse, the URL is used to determine what we're listening to
        return this.activeSSE.url?.includes(`/conversations/${convoId}/listen`);
    }

    clearConversation() {
        this.conversationId = null;
    }

    setConversationId(id: string | null) {
        this.conversationId = id;
        if (this.externalId && id) {
            SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}convo_${this.externalId}`, id);
        }
    }

    async createUser(externalId: string, profile?: Partial<BotpressProfile>) {
        if (this.userToken && this.externalId === externalId) {
            if (profile) this.lastProfile = { ...this.lastProfile, ...profile };
            return { botpressUserId: this.botpressUserId };
        }

        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                this.externalId = externalId;
                this.lastProfile = profile || null;
                const storedWebhook = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}webhook`);
                if (storedWebhook && storedWebhook !== WEBHOOK_ID) {
                    await this.clearSession(externalId);
                }

                const validKey = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}key_${externalId}`);
                const validUid = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}uid_${externalId}`);
                if (validKey && validUid) {
                    this.userToken = validKey;
                    this.botpressUserId = validUid;
                    await this.pushUserIdentity();
                }
                if (validKey && validUid) {
                    this.userToken = validKey;
                    this.botpressUserId = validUid;
                } else {
                    const res = await axios.post(
                        `${API_URL}/users`,
                        { externalId },
                        {
                            headers: { 'x-bot-id': BOT_ID },
                            timeout: REQUEST_TIMEOUT
                        }
                    );

                    const key = res.headers['x-user-key'] || res.data.key;
                    const uid = res.data.user?.id || res.data.id;

                    if (!key) throw new Error('[Botpress] No user key returned');

                    this.userToken = key;
                    this.botpressUserId = uid;

                    await Promise.all([
                        SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}key_${externalId}`, key),
                        SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}webhook`, WEBHOOK_ID),
                        uid ? SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}uid_${externalId}`, uid) : Promise.resolve(),
                    ]);
                }

                const savedConvo = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}convo_${externalId}`);
                if (savedConvo) {
                    this.conversationId = savedConvo;
                }

                return { botpressUserId: this.botpressUserId };
            } catch (err: any) {
                console.error('[Botpress] createUser error:', err.response?.data || err.message);
                throw err;
            } finally {
                this.initPromise = null;
            }
        })();
        return this.initPromise;
    }

    private async ensureInitialized() {
        if (this.initPromise) await this.initPromise;
        if (!this.userToken && this.externalId) {
            await this.createUser(this.externalId, this.lastProfile || undefined);
        }
    }

    async createConversation() {
        await this.ensureInitialized();
        if (!this.userToken) throw new Error('[Botpress] Not initialized');

        try {
            const res = await axios.post(
                `${API_URL}/conversations`,
                {},
                { headers: this.authHeaders(), timeout: REQUEST_TIMEOUT }
            );

            const id = res.data.conversation?.id || res.data.id;
            this.conversationId = id;

            if (this.externalId && id) {
                await SecureStore.setItemAsync(`${STORAGE_KEY_PREFIX}convo_${this.externalId}`, id);
            }
            await this.pushUserIdentity();
            return res.data;
        } catch (err: any) {
            console.error('[Botpress] createConversation Error FULL:', JSON.stringify(err.response?.data || err.message, null, 2));
            throw err;
        }
    }

    async updateUser(profile: Partial<BotpressProfile>) {
        if (profile) this.lastProfile = { ...this.lastProfile, ...profile };
        await this.pushUserIdentity();
    }

    private async pushUserIdentity() {
        if (!this.userToken || !this.lastProfile) return;

        const rawTier = (this.lastProfile.subscriptionTier || 'free').toLowerCase();
        const isPaid = rawTier === 'premium' || rawTier === 'ultra_premium' || rawTier.startsWith('user-');
        const tier = isPaid ? rawTier : 'free';
        const credits = String(this.lastProfile.messageCredits || 0);

        try {
            const timestamp = new Date().toISOString();
            const userDataPayload = {
                action: 'init',
                type: 'proactive',
                channel: 'web',
                name: this.lastProfile.name || 'Queen',
                subscriptionTier: tier,
                messageCredits: credits,
                email: this.lastProfile.email,
                externalId: this.externalId,
                userdata: {
                    subscriptionTier: tier,
                    email: this.lastProfile.email,
                    externalId: this.externalId,
                    userData: {
                        externalId: this.externalId,
                        email: this.lastProfile.email,
                        subscriptionTier: tier,
                    }
                },
                user_data: {
                    userData: {
                        externalId: this.externalId,
                        email: this.lastProfile.email,
                        subscriptionTier: tier,
                    }
                },
                message_credits: credits,
                lastUpdated: timestamp,
            };

            const tags: Record<string, string> = {
                email: this.lastProfile.email || '',
                userId: this.externalId || '',
                externalId: this.externalId || '',
                subscriptionTier: tier,
                subscription_tier: tier,
                messageCredits: credits,
                message_credits: credits,
                lastUpdated: timestamp,
                'webchat:id': this.externalId || '',
                'webchat:externalId': this.externalId || '',
                'webchat:email': this.lastProfile.email || '',
                'webchat:name': this.lastProfile.name || 'Queen',
                'user:id': this.externalId || '',
                'user:externalId': this.externalId || '',
                'user:email': this.lastProfile.email || '',
                // Inject JSON strings into tags for deeper lookups
                userdata: JSON.stringify(userDataPayload),
                userData: JSON.stringify(userDataPayload),
            };

            await axios.put(
                `${API_URL}/users/me`,
                {
                    name: this.lastProfile.name,
                    email: this.lastProfile.email,
                    tags: tags,
                    metadata: {
                        userData: userDataPayload,
                        ...userDataPayload
                    },
                    user_data: userDataPayload,
                    userdata: userDataPayload,
                    userData: userDataPayload
                },
                { headers: this.authHeaders(), timeout: REQUEST_TIMEOUT }
            );
        } catch (err: any) {
            // Some integrations don't support /users/me, but we inject context into events/messages anyway
            console.warn('[Botpress] pushUserIdentity skipped/failed:', err.response?.data?.message || err.message);
        }
    }

    async getOrStartLastConversation() {
        if (this.conversationId) return this.conversationId;

        if (this.externalId) {
            const saved = await SecureStore.getItemAsync(`${STORAGE_KEY_PREFIX}convo_${this.externalId}`);
            if (saved) {
                this.conversationId = saved;
                return saved;
            }
        }

        await this.createConversation();
        return this.conversationId;
    }

    async listConversations() {
        await this.ensureInitialized();
        if (!this.userToken) return { conversations: [] };

        try {
            const res = await axios.get(`${API_URL}/conversations`, {
                headers: this.authHeaders(),
                timeout: REQUEST_TIMEOUT,
            });
            return res.data;
        } catch (err: any) {
            console.warn('[Botpress] listConversations error:', err.message);
            return { conversations: [] };
        }
    }

    async deleteConversation(id: string) {
        await this.ensureInitialized();
        if (!this.userToken) throw new Error('[Botpress] Not initialized');

        await axios.delete(`${API_URL}/conversations/${id}`, {
            headers: this.authHeaders(),
            timeout: REQUEST_TIMEOUT,
        });

        if (this.conversationId === id) {
            this.conversationId = null;
            if (this.externalId) {
                await SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}convo_${this.externalId}`);
            }
        }
    }

    async sendMessage(text: string): Promise<any> {
        // Force rebuild to clear metro cache
        await this.ensureInitialized();
        if (!this.userToken || !this.conversationId) throw new Error('[Botpress] Not initialized');

        try {

            const payload = {
                conversationId: this.conversationId,
                payload: {
                    type: 'text',
                    text,
                    externalId: this.externalId,
                    metadata: {
                        name: this.lastProfile?.name || 'Queen',
                        subscriptionTier: this.lastProfile?.subscriptionTier || 'free',
                        messageCredits: this.lastProfile?.messageCredits || 0,
                        email: this.lastProfile?.email,
                        externalId: this.externalId,
                        userdata: {
                            subscriptionTier: this.lastProfile?.subscriptionTier || 'free',
                            email: this.lastProfile?.email,
                            externalId: this.externalId,
                            userData: {
                                externalId: this.externalId,
                                email: this.lastProfile?.email,
                                subscriptionTier: this.lastProfile?.subscriptionTier || 'free',
                            }
                        }
                    }
                },
                tags: { botId: BOT_ID }
            };

            console.log('[Botpress] Sending message with payload:', JSON.stringify(payload, null, 2));

            const res = await axios.post(
                `${API_URL}/messages`,
                payload,
                { headers: this.authHeaders(), timeout: REQUEST_TIMEOUT }
            );
            return res.data;
        } catch (err: any) {
            console.error('[Botpress] sendMessage Error FULL:', JSON.stringify(err.response?.data || err.message, null, 2));
            throw err;
        }
    }

    async listMessages(): Promise<any> {
        await this.ensureInitialized();
        if (!this.userToken || !this.conversationId) return { messages: [] };

        try {
            const res = await axios.get(
                `${API_URL}/conversations/${this.conversationId}/messages`,
                { headers: this.authHeaders(), timeout: REQUEST_TIMEOUT }
            );

            const messages = (res.data.messages || []).map((m: any) => ({
                id: m.id,
                payload: m.payload,
                userId: m.userId,
                conversationId: m.conversationId,
                createdAt: m.createdAt,
                direction: m.userId === this.botpressUserId ? 'outgoing' : 'incoming',
            }));

            return { messages, nextToken: res.data.nextToken };
        } catch (err: any) {
            if (err.response?.status === 404 || err.response?.status === 400) {
                console.warn('[Botpress] Conversation not found, clearing stale ID');
                this.conversationId = null;
                if (this.externalId) {
                    await SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}convo_${this.externalId}`);
                }
            }
            return { messages: [] };
        }
    }

    closeSSE() {
        this.sseClosedIntentionally = true;
        if (this.activeSSE) {
            try { this.activeSSE.close(); } catch (_) { }
            this.activeSSE = null;
        }
    }

    async listenForMessages(onMessage: (msg: any) => void): Promise<any> {
        await this.ensureInitialized();
        if (!this.userToken || !this.conversationId) return null;

        this.closeSSE();
        this.sseClosedIntentionally = false;

        const url = `${API_URL}/conversations/${this.conversationId}/listen`;

        const es = new EventSource(url, {
            headers: { 'x-user-key': this.userToken },
            lineEndingCharacter: '\n',
        });

        es.addEventListener('message', (event: any) => {
            if (!event?.data || typeof event.data !== 'string') return;
            const raw = event.data.trim();
            if (!raw || !raw.startsWith('{')) return;

            try {
                const parsed = JSON.parse(raw);
                console.log('[Botpress] Incoming SSE event:', parsed.type, (parsed.data?.userId === this.botpressUserId) ? '(User)' : '(Bot)', parsed.data?.payload?.text || '');
                if (parsed.type !== 'message_created') {
                    return;
                }
                const m = parsed.data;
                if (!m?.id || !m?.payload) return;
                if (m.payload?.text?.startsWith('[SYSTEM_EVENT]')) return;
                const msg: Message = {
                    id: m.id,
                    payload: m.payload,
                    userId: m.userId,
                    conversationId: m.conversationId,
                    createdAt: m.createdAt,
                    direction: (m.userId === this.botpressUserId) ? 'outgoing' : 'incoming',
                };
                onMessage(msg);
            } catch (e) {
            }
        });

        es.addEventListener('error', (event: any) => {
            if (this.sseClosedIntentionally) return;
            const msg = event?.message ?? '';
            console.warn('[Botpress] SSE error:', msg);

            try {
                const parsed = JSON.parse(msg);

                if (parsed.code === 403) {
                    this.closeSSE();
                    if (this.externalId) {
                        this.clearSession(this.externalId).then(() => {
                            onMessage({ _type: 'AUTH_ERROR' });
                        });
                    }
                    return;
                }

                if (parsed.code === 400 || parsed.code === 404) {
                    this.conversationId = null;
                    if (this.externalId) {
                        SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}convo_${this.externalId}`);
                    }
                    this.closeSSE();
                    onMessage({ _type: 'CONVERSATION_NOT_FOUND' });
                }
            } catch (_) { }
        });

        this.activeSSE = es;
        return es;
    }

    async sendEvent(type: string, payload: any) {
        await this.ensureInitialized();
        if (!this.userToken || !this.conversationId) {
            return;
        }

        try {
            await axios.post(
                `${API_URL}/events`,
                {
                    type,
                    payload: payload || {},
                    conversationId: this.conversationId
                },
                { headers: this.authHeaders(), timeout: REQUEST_TIMEOUT }
            );
        } catch (err: any) {
            console.warn('[Botpress] sendEvent error:', err.response?.data || err.message);
        }
    }

    async clearSession(externalId: string) {
        this.closeSSE();
        this.userToken = null;
        this.conversationId = null;
        this.botpressUserId = null;
        this.externalId = null;
        this.initPromise = null;
        this.lastProfile = null;

        await Promise.all([
            SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}key_${externalId}`),
            SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}uid_${externalId}`),
            SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}convo_${externalId}`),
            SecureStore.deleteItemAsync(`${STORAGE_KEY_PREFIX}webhook`),
        ]);
    }
}

export const botpress = new BotpressService();