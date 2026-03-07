"use client"

import { FormEvent, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"
import { useIdeaStore } from "@/store/useIdeaStore"

interface Props {
  open: boolean
  onClose: () => void
}

export default function IdeaForm({ open, onClose }: Props) {
  const router = useRouter()
  const authEmail = useAuthStore((state) => state.email)
  const createIdea = useIdeaStore((state) => state.createIdea)
  const submissionStatus = useIdeaStore((state) => state.submissionStatus)
  const error = useIdeaStore((state) => state.error)
  const clearError = useIdeaStore((state) => state.clearError)

  const [guestEmail, setGuestEmail] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (open) {
      clearError()
    }
  }, [open, clearError])

  const isSubmitting = submissionStatus === "submitting"

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearError()

    const trimmedEmail = (authEmail ?? guestEmail).trim()
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedEmail || !trimmedTitle) {
      return
    }

    const ideaId = await createIdea({
      userEmail: trimmedEmail,
      title: trimmedTitle,
      description: trimmedDescription,
    })

    if (!ideaId) {
      return
    }

    onClose()
    router.push(`/idea/${ideaId}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="idea-modal"
          >
            <button
              onClick={onClose}
              className="modal-close"
              type="button"
            >
              x
            </button>

            <h2 className="modal-title">
              Submit Your Startup Idea
            </h2>

            <form className="idea-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="idea-email">Email</label>

                <input
                  id="idea-email"
                  type="email"
                  placeholder="you@example.com"
                  value={authEmail ?? guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  disabled={isSubmitting || Boolean(authEmail)}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="idea-title">Idea Title</label>

                <input
                  id="idea-title"
                  type="text"
                  placeholder="AI powered hiring platform"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="idea-description">Description</label>

                <textarea
                  id="idea-description"
                  rows={4}
                  placeholder="Describe your startup idea..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {error && <p role="alert">{error}</p>}

              <button
                className="submit-idea"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Analyze Idea"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
