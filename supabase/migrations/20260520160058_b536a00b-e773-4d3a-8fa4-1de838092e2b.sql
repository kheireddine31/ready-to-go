UPDATE plans SET models = ARRAY[
  'Clé API OpenRouter dédiée',
  'Accès aux modèles économiques (~150 modèles)',
  'GPT-4o-mini, Gemini Flash, Llama 3.3, Mistral',
  'Idéal pour tester et découvrir'
] WHERE slug = 'decouverte';

UPDATE plans SET models = ARRAY[
  'Clé API OpenRouter dédiée',
  'Accès à ~200 modèles texte',
  'GPT-4o-mini, Claude Haiku, Gemini Flash, DeepSeek',
  'Llama, Mistral, Qwen, Command-R',
  'Parfait pour usage régulier'
] WHERE slug = 'debutant';

UPDATE plans SET models = ARRAY[
  'Clé API OpenRouter dédiée',
  'Accès aux ~300 modèles OpenRouter',
  'GPT-4o, Claude 3.5 Sonnet, Gemini 2.0 Pro',
  'Llama 405B, DeepSeek R1, Grok',
  'Modèles image (DALL-E, Flux, SDXL)',
  'Pour créateurs et développeurs'
] WHERE slug = 'createur';

UPDATE plans SET models = ARRAY[
  'Clé API OpenRouter dédiée — quota élevé',
  'Accès complet aux ~300 modèles OpenRouter',
  'Tous modèles premium : GPT-4o, Claude Opus, o1',
  'Gemini 2.0 Pro, Grok 2, DeepSeek R1',
  'Modèles image & multimodaux',
  'Limites de débit supérieures',
  'Support prioritaire WhatsApp'
] WHERE slug = 'pro';