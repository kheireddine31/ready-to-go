import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listModels } from "@/lib/app.functions";
import { ModelLogo } from "@/components/model-logo";

export function ModelsShowcase({
  title = "Tous les modèles disponibles",
  subtitle = "Plus de 300 modèles IA — voici les plus utilisés sur DZD.AI",
}: {
  title?: string;
  subtitle?: string;
}) {
  const fetchModels = useServerFn(listModels);
  const { data } = useQuery({ queryKey: ["models"], queryFn: () => fetchModels() });
  const models = data ?? [];

  return (
    <section className="px-6 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {models.map((m, i) => (
            <motion.div
              key={m.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
              whileHover={{ y: -3 }}
              className="relative glass rounded-2xl p-4 text-center hover:border-primary/50 transition-colors"
            >
              {m.badge && (
                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[8px] font-bold tracking-wider">
                  {m.badge}
                </span>
              )}
              <div className="mx-auto mb-2 flex items-center justify-center">
                <ModelLogo slug={m.slug} provider={m.provider} size={48} />
              </div>
              <div className="text-xs font-semibold truncate">{m.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{m.provider}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
