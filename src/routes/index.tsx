import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Shield, Zap, Search } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ModelsShowcase } from "@/components/models-showcase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DZD.AI — L'Intelligence Artificielle payée en Dinars" },
      {
        name: "description",
        content:
          "Sans carte Visa. Payez ChatGPT, Claude, Gemini, Midjourney en DZD via BaridiMob, CCP ou CIB. Pour les Algériens.",
      },
    ],
  }),
  component: HomePage,
});

const QUICK_TAGS = [
  "Générateur Vidéo",
  "Agent SEO",
  "Créateur d'Images",
  "Analyste de Données",
  "Assistant Code",
];

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* HERO */}
      <section className="relative pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8 text-xs font-medium text-primary"
          >
            <Sparkles className="w-3.5 h-3.5" />
            +1,200 Algériens utilisent déjà DZD.AI
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-[1.05]"
          >
            L'Intelligence Artificielle
            <br />
            <span className="text-gradient">sans carte Visa</span>,
            <br />
            payée en DZD.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
          >
            ChatGPT, Claude, Gemini, DeepSeek, Llama et plus de 300 modèles IA accessibles via
            BaridiMob ou virement bancaire. Une seule plateforme, un seul abonnement.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative max-w-2xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary-glow/30 blur-2xl rounded-2xl" />
            <div className="relative glass-strong rounded-2xl p-2 flex items-center gap-2">
              <Search className="w-5 h-5 ml-3 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Que voulez-vous créer aujourd'hui ?"
                className="flex-1 bg-transparent outline-none px-2 py-3 text-base placeholder:text-muted-foreground"
              />
              <Link
                to="/dashboard"
                className="bg-primary hover:bg-primary-glow text-primary-foreground font-medium px-5 py-3 rounded-xl flex items-center gap-2 transition-colors text-sm"
              >
                Commencer
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* Quick tags */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-2 mt-6"
          >
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                className="px-4 py-2 text-xs rounded-full glass hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
              >
                {tag}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* MODELS SHOWCASE */}
      <ModelsShowcase />


      {/* HOW IT WORKS */}
      <section className="px-6 py-20 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Comment ça marche ?</h2>
            <p className="text-muted-foreground">3 étapes, 24 heures, et vous êtes dedans.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                icon: Sparkles,
                title: "Inscrivez-vous",
                desc: "Créez votre compte gratuitement avec votre email.",
              },
              {
                num: "02",
                icon: Zap,
                title: "Payez en DZD",
                desc: "Choisissez votre forfait et envoyez via BaridiMob, CCP ou CIB.",
              },
              {
                num: "03",
                icon: Shield,
                title: "Recevez votre accès",
                desc: "Sous 24h, votre clé API arrive par email. Vous êtes prêt.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-3xl font-display font-bold text-muted-foreground/40">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-glow text-primary-foreground font-medium px-6 py-3 rounded-xl transition-colors glow-emerald"
            >
              Voir les forfaits
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
