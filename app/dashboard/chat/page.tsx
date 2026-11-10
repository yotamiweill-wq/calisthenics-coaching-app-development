import { requireTrainee } from '@/lib/auth'
import { TraineeHeader } from '@/components/trainee/trainee-header'
import { ChatThread } from '@/components/chat/chat-thread'

export const metadata = { title: 'צ׳אט עם המאמן | STATIC LAB' }

export default async function ChatPage() {
  const profile = await requireTrainee()

  return (
    <div className="min-h-dvh bg-background">
      <TraineeHeader fullName={profile.full_name} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-balance">צ׳אט עם המאמן</h1>
          <p className="text-muted-foreground">שיחה פרטית בינך לבין המאמן.</p>
        </div>
        <ChatThread traineeId={profile.id} currentUserId={profile.id} otherName="המאמן" />
      </main>
    </div>
  )
}
