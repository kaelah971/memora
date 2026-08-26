"use client";

import { useState, useTransition } from "react";

import { saveCreatorVoice } from "@/app/app/settings/actions";
import { creatorVoices, type CreatorVoice } from "@/types/data";

const voiceLabels: Record<CreatorVoice, { label: string; detail: string }> = {
  warm: { label: "Warm", detail: "Personal, generous, and conversational." },
  direct: { label: "Direct", detail: "Clear, concise, and action-oriented." },
  "beginner-friendly": { label: "Beginner-friendly", detail: "Simple language with an encouraging first step." },
  professional: { label: "Professional", detail: "Polished, composed, and precise." },
  playful: { label: "Playful", detail: "Light, human, and a little unexpected." },
};

export function CreatorVoiceSettings({ initialVoice }: { initialVoice: CreatorVoice }) {
  const [voice, setVoice] = useState(initialVoice);
  const [savedVoice, setSavedVoice] = useState(initialVoice);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(): void {
    setError(null);
    startTransition(async () => {
      const result = await saveCreatorVoice(voice);
      if (!result.ok || !result.voice) {
        setError(result.error ?? "The creator voice could not be saved.");
        return;
      }
      setSavedVoice(result.voice);
    });
  }

  return (
    <section className="settings-voice" aria-labelledby="settings-voice-title">
      <div className="settings-voice__header">
        <div>
          <span className="section-label">CREATOR VOICE</span>
          <h2 id="settings-voice-title">Choose how Memora sounds like you.</h2>
          <p>New drafts and future Mind prompts use this preference. Source facts and approval boundaries do not change.</p>
        </div>
        <span className="state-sticker state-sticker--active">ACTIVE / {voiceLabels[savedVoice].label.toUpperCase()}</span>
      </div>
      <div className="settings-voice__control">
        <label className="data-label" htmlFor="creator-voice">ACTIVE CREATOR VOICE</label>
        <select
          id="creator-voice"
          value={voice}
          onChange={(event) => setVoice(event.target.value as CreatorVoice)}
          disabled={isPending}
        >
          {creatorVoices.map((option) => (
            <option key={option} value={option}>{voiceLabels[option].label}</option>
          ))}
        </select>
        <p>{voiceLabels[voice].detail}</p>
        <button className="primary-button" type="button" onClick={save} disabled={isPending || voice === savedVoice}>
          {isPending ? "SAVING..." : voice === savedVoice ? "VOICE SAVED" : "SAVE CREATOR VOICE"}
        </button>
        <p className="settings-voice__status" role="status" aria-live="polite">
          {error ?? (voice === savedVoice ? `Saved as ${voiceLabels[savedVoice].label}.` : "Unsaved voice change.")}
        </p>
      </div>
    </section>
  );
}
