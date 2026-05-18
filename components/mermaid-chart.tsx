"use client";

import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";

export function MermaidChart({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "strict",
      themeVariables: {
        primaryColor: "#ffffff",
        primaryTextColor: "#111111",
        primaryBorderColor: "#111111",
        lineColor: "#111111",
        secondaryColor: "#fbfaf5",
        tertiaryColor: "#f6f3ea",
        fontFamily: "Arial"
      }
    });
    mermaid
      .render(`pagemind-${id}`, chart)
      .then(({ svg: rendered }) => {
        if (mounted) setSvg(rendered);
      })
      .catch(() => {
        if (mounted) setError("Flowchart could not be rendered.");
      });
    return () => {
      mounted = false;
    };
  }, [chart, id]);

  if (error) return <pre className="overflow-auto rounded-2xl border-[1.5px] border-black bg-[#fbfaf5] p-4 text-xs text-black/65">{chart}</pre>;

  return (
    <div
      className="flowchart overflow-auto rounded-2xl border-[1.5px] border-black bg-[#fbfaf5] p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
