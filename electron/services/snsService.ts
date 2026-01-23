import { wcdbService } from './wcdbService'
import { ConfigService } from './config'
import { ContactCacheService } from './contactCacheService'

export interface SnsPost {
    id: string
    username: string
    nickname: string
    avatarUrl?: string
    createTime: number
    contentDesc: string
    type?: number
    media: { url: string; thumb: string }[]
    likes: string[]
    comments: { id: string; nickname: string; content: string; refCommentId: string; refNickname?: string }[]
}

class SnsService {
    private contactCache: ContactCacheService

    constructor() {
        const config = new ConfigService()
        this.contactCache = new ContactCacheService(config.get('cachePath') as string)
    }

    async getTimeline(limit: number = 20, offset: number = 0, usernames?: string[], keyword?: string, startTime?: number, endTime?: number): Promise<{ success: boolean; timeline?: SnsPost[]; error?: string }> {
        console.log('[SnsService] getTimeline called with:', { limit, offset, usernames, keyword, startTime, endTime })

        const result = await wcdbService.getSnsTimeline(limit, offset, usernames, keyword, startTime, endTime)

        console.log('[SnsService] getSnsTimeline result:', {
            success: result.success,
            timelineCount: result.timeline?.length,
            error: result.error
        })

        if (result.success && result.timeline) {
            const enrichedTimeline = result.timeline.map((post: any) => {
                const contact = this.contactCache.get(post.username)

                // 修复媒体 URL，如果是 http 则尝试用 https (虽然 qpic 可能不支持强制 https，但通常支持)
                const fixedMedia = post.media.map((m: any) => ({
                    url: m.url.replace('http://', 'https://'),
                    thumb: m.thumb.replace('http://', 'https://')
                }))

                return {
                    ...post,
                    avatarUrl: contact?.avatarUrl,
                    nickname: post.nickname || contact?.displayName || post.username,
                    media: fixedMedia
                }
            })

            console.log('[SnsService] Returning enriched timeline with', enrichedTimeline.length, 'posts')
            return { ...result, timeline: enrichedTimeline }
        }

        console.log('[SnsService] Returning result:', result)
        return result
    }
}

export const snsService = new SnsService()
