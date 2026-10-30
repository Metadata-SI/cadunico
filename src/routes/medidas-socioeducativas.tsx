import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

export const Route = createFileRoute("/medidas-socioeducativas")({
  head: () => ({
    meta: [
      { title: "Medidas Socioeducativas — Cadastro Único de Natal/RN" },
      {
        name: "description",
        content:
          "Módulo de medidas socioeducativas do Observatório Social de Natal/RN: adolescentes em cumprimento de medida e fatores de risco.",
      },
      { property: "og:title", content: "Medidas Socioeducativas — Natal/RN" },
      {
        property: "og:description",
        content:
          "Indicadores de adolescentes em cumprimento de medidas socioeducativas em Natal/RN.",
      },
    ],
  }),
  component: MedidasSocioeducativasPage,
});

function MedidasSocioeducativasPage() {
  return (
    <ModulePlaceholder
      title="Medidas Socioeducativas"
      plannedIndicators={[
        "Adolescentes de 12 a 17 anos cadastrados",
        "Adolescentes fora da escola",
        "Trabalho infantil entre adolescentes",
        "Famílias com adolescentes em extrema pobreza",
        "Adolescentes em cumprimento de medida (LA/PSC)",
        "Distribuição territorial por zona e bairro",
      ]}
    />
  );
}
