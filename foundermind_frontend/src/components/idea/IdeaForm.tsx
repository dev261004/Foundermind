"use client"

import { motion, AnimatePresence } from "framer-motion"

interface Props {
    open: boolean
    onClose: () => void
}

export default function IdeaForm({ open, onClose }: Props) {

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
                        initial={{ scale: .9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: .9, opacity: 0 }}
                        transition={{ duration: .25 }}
                        className="idea-modal"
                    >

                        <button
                            onClick={onClose}
                            className="modal-close"
                        >
                            ✕
                        </button>

                        <h2 className="modal-title">
                            Submit Your Startup Idea
                        </h2>

                        <form className="idea-form">

                            <div className="input-group">

                                <label>Idea Title</label>

                                <input
                                    type="text"
                                    placeholder="AI powered hiring platform"
                                />

                            </div>

                            <div className="input-group">

                                <label>Description</label>

                                <textarea
                                    rows={4}
                                    placeholder="Describe your startup idea..."
                                />

                            </div>

                            <button className="submit-idea">
                                Analyze Idea
                            </button>

                        </form>

                    </motion.div>

                </motion.div>

            )}

        </AnimatePresence>

    )

}