"use client"

import { useState, useEffect } from "react"
import IdeaForm from "@/components/idea/IdeaForm"

export default function Page() {

    const [open, setOpen] = useState(false)

    useEffect(() => {
        setOpen(true)
    }, [])

    return (

        <IdeaForm
            open={open}
            onClose={() => setOpen(false)}
        />

    )

}