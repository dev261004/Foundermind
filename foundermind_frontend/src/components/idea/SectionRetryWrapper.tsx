"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react"
import type { SectionState } from "@/types/analysis"
import { useRunStore } from "@/store/useRunStore"
import styles from "./SectionRetryWrapper.module.css"

interface SectionRetryWrapperProps {
  sectionKey: string
  children: React.ReactNode
}

const STATUS_LABELS: Record<string, string> = {
  data_unavailable: "Data unavailable",
  quota_exhausted: "Quota exhausted",
  temporary_api_error: "Temporary error",
  tool_error: "Analysis error",
  running: "Retrying…",
  success: "",
}

function getCooldownRemaining(cooldownUntil: string | null): number {
  if (!cooldownUntil) return 0
  try {
    const deadline = new Date(cooldownUntil + "Z").getTime()
    const now = Date.now()
    return Math.max(0, Math.ceil((deadline - now) / 1000))
  } catch {
    return 0
  }
}

export function SectionRetryWrapper({ sectionKey, children }: SectionRetryWrapperProps) {
  const sectionStates = useRunStore((s) => s.sectionStates)
  const activeRunId = useRunStore((s) => s.activeRunId)
  const retrySection = useRunStore((s) => s.retrySection)

  const sectionState: SectionState | undefined = sectionStates[sectionKey]
  const [cooldown, setCooldown] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize/update cooldown from backend state
  useEffect(() => {
    if (!sectionState?.cooldown_until) {
      setCooldown(0)
      return
    }
    const remaining = getCooldownRemaining(sectionState.cooldown_until)
    setCooldown(remaining)
  }, [sectionState?.cooldown_until])

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [cooldown])

  // Sync running state
  useEffect(() => {
    if (sectionState?.status === "running") {
      setIsRetrying(true)
    } else {
      setIsRetrying(false)
    }
  }, [sectionState?.status])

  const handleRetry = useCallback(async () => {
    if (!activeRunId || isRetrying || cooldown > 0) return
    setIsRetrying(true)
    try {
      await retrySection(activeRunId, sectionKey)
    } finally {
      setIsRetrying(false)
    }
  }, [activeRunId, isRetrying, cooldown, retrySection, sectionKey])

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  // No section state or section is successful — just render children
  if (!sectionState || sectionState.status === "success") {
    return <>{children}</>
  }

  const statusLabel = STATUS_LABELS[sectionState.status] || sectionState.status
  const isRunning = sectionState.status === "running" || isRetrying
  const isCooldownActive = cooldown > 0
  const isRetryable = sectionState.retryable && !isRunning

  return (
    <div className={styles.wrapper}>
      {/* Render children (existing section content) */}
      {children}

      {/* Retry overlay bar */}
      <div className={`${styles.retryBar} ${styles[`retryBar--${sectionState.status}`] || ""}`}>
        <div className={styles.retryBarContent}>
          {/* Status icon */}
          <div className={styles.statusIcon}>
            {isRunning ? (
              <Loader2 className={`${styles.icon} ${styles.spinning}`} />
            ) : sectionState.status === "data_unavailable" ? (
              <AlertCircle className={`${styles.icon} ${styles.iconWarn}`} />
            ) : (
              <XCircle className={`${styles.icon} ${styles.iconError}`} />
            )}
          </div>

          {/* Status message */}
          <div className={styles.statusText}>
            <span className={styles.statusLabel}>{statusLabel}</span>
            {sectionState.message && !isRunning && (
              <span className={styles.statusMessage}>{sectionState.message}</span>
            )}
            {isRunning && (
              <span className={styles.statusMessage}>Analyzing this section…</span>
            )}
          </div>

          {/* Action area */}
          <div className={styles.actionArea}>
            {isRunning ? (
              <div className={styles.runningIndicator}>
                <span className={styles.pingDot}>
                  <span className={styles.pingDotInner} />
                  <span className={styles.pingDotPulse} />
                </span>
                <span className={styles.runningText}>Running</span>
              </div>
            ) : isRetryable && isCooldownActive ? (
              <button
                type="button"
                className={`${styles.retryBtn} ${styles.retryBtnDisabled}`}
                disabled
              >
                <Clock className={styles.retryBtnIcon} />
                <span>Retry in {formatCountdown(cooldown)}</span>
              </button>
            ) : isRetryable ? (
              <button
                type="button"
                className={styles.retryBtn}
                onClick={handleRetry}
              >
                <RefreshCw className={styles.retryBtnIcon} />
                <span>Retry analysis</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Inline section logs */}
        {isRunning && (
          <SectionRetryLogs
            sectionKey={sectionKey}
            retryAttemptId={sectionState.retry_attempt_id}
          />
        )}
      </div>
    </div>
  )
}


function SectionRetryLogs({
  sectionKey,
  retryAttemptId,
}: {
  sectionKey: string
  retryAttemptId?: string | null
}) {
  const executionLog = useRunStore((s) => s.executionLog)

  const sectionLogs = retryAttemptId
    ? executionLog.filter(
        (entry) =>
          entry.section_key === sectionKey &&
          entry.retry_attempt_id === retryAttemptId
      )
    : []

  if (sectionLogs.length === 0) {
    return (
      <div className={styles.logsEmpty}>
        Waiting for retry logs…
      </div>
    )
  }

  return (
    <div className={styles.logsContainer}>
      {sectionLogs.map((entry, index) => (
        <div key={index} className={styles.logEntry}>
          <div className={styles.logDot}>
            {entry.status === "started" ? (
              <Loader2 className={styles.logDotIcon} />
            ) : entry.status === "completed" || entry.status === "success" ? (
              <CheckCircle className={styles.logDotIcon} />
            ) : (
              <AlertCircle className={styles.logDotIcon} />
            )}
          </div>
          <span className={styles.logMessage}>
            {entry.message || `${entry.tool || entry.agent || "event"}: ${entry.status}`}
          </span>
        </div>
      ))}
    </div>
  )
}
