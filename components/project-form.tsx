"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function ProjectForm({ project }: { project?: {
  id: string;
  name: string;
  targetDomain: string;
  region: string;
  device: string;
} }) {
  const router = useRouter();
  const [name, setName] = useState(project?.name ?? "");
  const [targetDomain, setTargetDomain] = useState(project?.targetDomain ?? "");
  const [region, setRegion] = useState(project?.region ?? "www.google.co.uk");
  const [device, setDevice] = useState(project?.device ?? "desktop");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = project ? `/api/projects/${project.id}` : "/api/projects";
    const method = project ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, targetDomain, region, device }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to save");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/projects/${project?.id ?? data.project.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="mb-1 block text-xs text-muted">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">Target domain</label>
        <Input
          value={targetDomain}
          onChange={(e) => setTargetDomain(e.target.value)}
          placeholder="example.com"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">Google region</label>
        <Input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="www.google.co.uk"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">Device</label>
        <Select value={device} onChange={(e) => setDevice(e.target.value)}>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </Select>
      </div>
      {error && <p className="text-sm text-red">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : project ? "Save changes" : "Create project"}
      </Button>
    </form>
  );
}
