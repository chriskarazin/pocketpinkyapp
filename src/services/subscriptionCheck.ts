import { supabase } from './supabase';

export async function checkSubscriptionTier(userId: string): Promise<{ plan: string, messageCredits: number }> {
    try {
        if (!userId) {
            return { plan: 'free', messageCredits: 0 };
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('plan, message_credits')
            .eq('id', userId)
            .single();

        if (error) {
            console.log('Error fetching subscription data:', error);
            return { plan: 'free', messageCredits: 0 };
        }

        return {
            plan: data?.plan || 'free',
            messageCredits: data?.message_credits || 0
        };
    } catch (error) {
        console.error('Error in checkSubscriptionTier:', error);
        return { plan: 'free', messageCredits: 0 };
    }
}
