"use client";

import { useState, type FormEvent } from "react";
import { Loader2, PlusCircle } from "lucide-react";
import { useCreateCircle } from "@/hooks/useCreateCircle";
import { Toast } from "@/components/Toast";
import { FREQUENCIES, type Frequency } from "@/lib/circleMeta";

type Props = {
  onCreated: (circleId: string) => void;
};

export function CreateCircleForm({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("5");
  const [frequency, setFrequency] = useState<Frequency>("Weekly");
  const [maxParticipants, setMaxParticipants] = useState(6);

  const { createCircle, isPending, isWalletPrompting, isMining, toast, clearToast } =
    useCreateCircle((result) => {
      onCreated(result.circleId);
      setName("");
      setAmount("5");
      setFrequency("Weekly");
      setMaxParticipants(6);
    });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void createCircle({
      name,
      contributionMon: amount,
      frequency,
      maxParticipants,
    });
  };

  const label = isWalletPrompting
    ? "Confirm in wallet"
    : isMining
      ? "Creating onchain…"
      : isPending
        ? "Creating…"
        : "Create Circle";

  return (
    <section className="panel" aria-labelledby="create-heading">
      <div className="panel-head">
        <div>
          <h2 id="create-heading">Create a Susu Circle</h2>
          <p className="sub">
            Set contribution rules and open seats for your rotating savings circle.
          </p>
        </div>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">Circle Name</span>
          <input
            className="field-input"
            type="text"
            placeholder="e.g. Accra Market Circle"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={48}
            required
          />
        </label>

        <label className="field">
          <span className="label">Contribution Amount (MON)</span>
          <input
            className="field-input"
            type="number"
            inputMode="decimal"
            min="0.0001"
            step="any"
            placeholder="5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="label">Contribution Frequency</span>
          <select
            className="field-input"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Maximum Participants</span>
          <input
            className="field-input"
            type="number"
            min={2}
            max={50}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            required
          />
        </label>

        <button
          type="submit"
          className="btn btn-primary form-submit"
          disabled={isPending}
        >
          {isPending ? <Loader2 className="icon spin" /> : <PlusCircle className="icon" />}
          {label}
        </button>
      </form>

      <Toast toast={toast} onClose={clearToast} />
    </section>
  );
}
