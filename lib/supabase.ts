
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Helper to check if credentials are valid
export const hasSupabase = !!(supabaseUrl && supabaseUrl.startsWith('http'))

// Only initialize if we have a valid URL to prevent build-time crashes and runtime exceptions
export const supabase = hasSupabase
    ? createClient(supabaseUrl, supabaseAnonKey)
    : new Proxy({} as any, {
        get: () => {
            const noop = () => ({
                data: null,
                error: { message: 'Supabase credentials missing' },
                channel: () => ({
                    on: () => ({ subscribe: () => ({}) }),
                    subscribe: () => ({})
                }),
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            single: () => ({ data: null }),
                            order: () => ({})
                        }),
                        maybeSingle: () => ({ data: null }),
                        order: () => ({})
                    }),
                    insert: () => ({ error: { message: 'Supabase credentials missing' } }),
                    update: () => ({ eq: () => ({ error: { message: 'Supabase credentials missing' } }) }),
                    delete: () => ({ eq: () => ({ error: { message: 'Supabase credentials missing' } }) }),
                }),
                removeChannel: () => { }
            });
            return noop;
        }
    }) as ReturnType<typeof createClient>


