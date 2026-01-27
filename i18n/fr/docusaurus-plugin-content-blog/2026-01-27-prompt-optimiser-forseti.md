---
slug: forseti-first-prompt-optimization
title: "Forseti461 Prompt v1 : Modération IA conforme à la Charte pour Audierne2026"
authors: [jnxmas]
tags: [encode, ai-ml, civictech, observability, opik]
---

> **Forseti461** est un agent IA qui modère automatiquement les contributions citoyennes sur les plateformes de démocratie participative — approuvant uniquement les idées concrètes, constructives et localement pertinentes, tout en rejetant les attaques personnelles, le spam, les hors-sujets ou la désinformation, et en expliquant toujours ses décisions avec des retours respectueux et actionnables.

:::tip
Ce week-end, Facebook nous a rappelé que la démocratie est fragile. Commentaires toxiques, attaques personnelles et diatribes hors-sujet ont envahi les discussions sur les enjeux locaux. Le signal se perd dans le bruit. Les citoyens se désengagent. Les voix constructives abandonnent.
:::
**Et si nous pouvions protéger le débat civique à grande échelle ?**

<!-- truncate -->

## Le problème que nous résolvons

Dans le cadre du **Hackathon Commit to Change AI Agents** (Encode), nous construisons **Ò Capistaine** — une plateforme de transparence civique alimentée par l'IA pour les élections municipales d'Audierne-Esquibien 2026. La plateforme reçoit les contributions citoyennes via Framaforms, et chacune doit être validée selon notre **Charte de contribution** publiée avant d'atteindre le forum public.

La charte est claire :

| ✅ Encouragé                           | ❌ Non accepté                               |
| -------------------------------------- | -------------------------------------------- |
| Propositions concrètes et argumentées  | Attaques personnelles                        |
| Critiques constructives                | Propos discriminatoires                      |
| Questions et demandes de clarification | Spam et publicité                            |
| Partage d'expertise locale             | Contenu hors-sujet (sans lien avec Audierne) |
| Suggestions d'amélioration             | Fausses informations                         |

**Le défi** : Comment appliquer cela à grande échelle tout en restant équitable, explicable et constructif ? Une attaque personnelle non détectée pourrait empoisonner toute la discussion. Un faux positif pourrait faire taire une voix légitime.

## Voici Forseti461

Nommé d'après le dieu nordique de la justice **Forseti**, et réincarné dans l'esprit du Cap Sizun (l'emblématique "461" local), Forseti461 sert de gardien impartial. Calme, vigilant et inflexible.

Mais un modérateur IA n'est aussi bon que son prompt. Notre première version avait une précision de base d'environ 20% sur les cas limites. Les violations subtiles passaient à travers. Des contributions valides étaient incorrectement signalées.

**Nous devions optimiser de manière systématique.**

## L'expérience OPIK

En utilisant **Opik** (Comet ML) pour l'observabilité et l'optimisation de prompt, nous avons mené notre première expérience structurée :

![Vue Projet OPIK](/img/project_view.png)

Notre infrastructure d'évaluation :

- **Default Project** : Traces des workflows N8N (interactions chatbot en production)
- **ocapistaine_test** : Traces et spans de l'application
- **Optimization** : Expériences d'optimisation de prompt avec des datasets contrôlés

### Le Dataset

Nous avons construit un dataset de test en utilisant notre [système de mockup](/blog/first-submission-mockup-system) — générant des variations contrôlées de contributions avec des résultats attendus connus :

![Vue Dataset](/img/dataset_view.png)

Chaque entrée comprend :

- Contributions valides (vérité terrain : approuvées)
- Violations subtiles (vérité terrain : rejetées)
- Violations agressives (vérité terrain : rejetées)
- Cas limites pour stress-tester le prompt

### Exécution de l'optimisation

Nous avons utilisé le **MetaPromptOptimizer** d'OPIK pour affiner itérativement le prompt système :

![Progression de l'optimisation](/img/optimization_view.png)

![Vue Spans](/img/spans_view.png)

## Les résultats

![Exceptionnel : 0.92 de précision, +368.416% d'amélioration](/img/result.png)

| Métrique             | Avant     | Après      | Évolution |
| -------------------- | --------- | ---------- | --------- |
| **Précision Charte** | ~20%      | **92%**    | **+368%** |
| Gestion cas limites  | Faible    | Forte      | —         |
| Explicabilité        | Générique | Spécifique | —         |

Le prompt optimisé identifie correctement les violations subtiles tout en acceptant les contributions valides — et explique pourquoi dans chaque cas.

## Le prompt optimisé

Voici **Forseti461 v1** — le prompt système conforme à la charte :

```
System
Tu es Forseti 461, le gardien impartial de la vérité et de la charte de contribution pour Audierne2026.

## Ton identité
Nommé d'après le dieu nordique de la justice Forseti, tu renais dans l'esprit du Cap Sizun
(l'emblématique "461" local). Tu es calme, vigilant et inflexible dans tes fonctions.

## Ta mission
Tu filtres soigneusement chaque soumission à la plateforme de démocratie participative Audierne2026 :
- Approuvant uniquement les contributions concrètes, constructives et localement pertinentes
  qui répondent directement aux besoins et problèmes de la communauté.
- Rejetant fermement les attaques personnelles, la discrimination, le spam, le contenu
  hors-sujet, le matériel promotionnel ou les fausses informations.
- Surveillant activement les soumissions pour assurer qualité et pertinence, rejetant
  celles qui ne répondent pas à ces standards.
- Garantissant que seules les idées respectueuses et conformes à la charte atteignent Ò Capistaine.

## Tes valeurs
- **Impartialité** : Tu juges le contenu, pas les personnes.
- **Clarté** : Tu expliques tes décisions clairement, incluant les critères spécifiques
  utilisés pour l'évaluation.
- **Équité** : Tu appliques les mêmes standards à tous.
- **Constructivité** : Tu guides les contributeurs vers une meilleure participation en
  fournissant des suggestions d'amélioration actionnables.

## Critères d'évaluation
- Les contributions doivent être pertinentes aux enjeux locaux et fournir des exemples
  spécifiques ou des données pour appuyer les affirmations.
- Les soumissions doivent être constructives, offrant des solutions ou idées qui peuvent
  être développées davantage.
- Expose clairement ce qui est inacceptable : les attaques personnelles, les propos
  discriminatoires et le contenu promotionnel entraîneront un rejet.
- Lors du rejet d'une soumission, précise les raisons basées sur ces critères et suggère
  comment le contributeur peut améliorer sa soumission, par exemple en ajoutant plus de
  détails, d'exemples ou de références aux enjeux locaux.

## Style de réponse
- Sois concis mais complet.
- Fournis un raisonnement clair pour les décisions, en référençant les critères d'évaluation.
- Utilise le contexte culturel français quand pertinent pour Audierne-Esquibien.
- **Insiste sur le respect** : Indique clairement que les attaques personnelles, les propos
  discriminatoires et le contenu promotionnel sont inacceptables et nuisent à la qualité
  du débat.

Les contributeurs doivent être conscients qu'un tel langage ou matériel non pertinent
entraînera le rejet de leurs soumissions. De plus, renforce l'importance de maintenir
un dialogue respectueux et constructif pour favoriser une communauté positive. Inclus des
exemples de langage respectueux et de critique constructive pour guider les contributeurs.
```

## Exemple : Avant vs Après

### Entrée (Violation subtile)

```
Catégorie: economie
Constat: Le parking du port est souvent plein en été.
Idées: Si nos brillants élus avaient un minimum de bon sens, ils auraient
réglé ce problème depuis longtemps. Mais bon, quand on voit qui nous dirige...
```

### Avant optimisation

```json
{
  "is_valid": true,
  "confidence": 0.75,
  "reasoning": "Traite d'un problème de parking local"
}
```

**❌ A manqué le ton condescendant et l'attaque implicite envers les élus.**

### Après optimisation

```json
{
  "is_valid": false,
  "confidence": 0.89,
  "violations": ["ton_condescendant", "attaque_indirecte_elus"],
  "reasoning": "Bien que la contribution aborde un vrai problème local (parking du port),
    le ton est condescendant ('si nos brillants élus avaient un minimum de bon sens')
    et inclut des attaques indirectes envers les élus ('quand on voit qui nous dirige').
    Cela nuit au dialogue constructif.",
  "suggestion": "Reformuler sans jugement sur les personnes : 'Le parking du port est
    souvent plein en été. Je propose d'étudier la création d'un parking relais à
    l'entrée de la ville avec navette gratuite vers le centre.'"
}
```

**✅ A correctement identifié la violation ET fourni des conseils constructifs.**

## Expériences quotidiennes : Amélioration continue

Cette optimisation de prompt s'appuie directement sur nos précédents [ateliers OPIK](https://docs.comet.com/opik) et le [framework de test mockup](/blog/first-submission-mockup-system). Les traces de **ocapistaine_test** nous aident à observer les patterns de rejet et à itérer.

Nous avons maintenant implémenté des **expériences quotidiennes** pour suivre les performances de Forseti dans le temps :

```python
from app.processors.mockup_processor import MockupProcessor

processor = MockupProcessor()

# Lancer l'évaluation quotidienne
result = await processor.run_daily_experiment()

# Métriques suivies :
# - Précision charte (classification valide/invalide correcte)
# - Vrais positifs (invalides correctement rejetés)
# - Faux négatifs (invalides incorrectement acceptés) — le pire cas !
# - Précision, Rappel, Score F1
```

Les résultats de chaque jour sont enregistrés dans OPIK comme expérience nommée (`forseti_daily_2026-01-27`), nous permettant de :

- Suivre les régressions lors des changements de prompt
- Comparer les performances des providers (Gemini vs Claude)
- Construire la confiance pour le déploiement en production

## Prochaines étapes

**Statut actuel (27 janvier 2026):** Prompt v1 en test via intégration N8N + Gemini.

**À venir :**

1. Fusionner les workflows N8N dans le projet **ocapistaine_dev**
2. Étendre à la **détection de désinformation** avec RAG sur données locales
3. Lancer des ensembles d'évaluation plus larges couvrant les 7 catégories
4. Collecter des **boucles de feedback utilisateur** sur les rejets
5. **Mode entrée terrain** : Générer des contributions de test à partir de vrais documents municipaux (discours du maire, audiences publiques)

Cela positionne Forseti461 / Ò Capistaine pour un fort **Impact Communautaire** dans le hackathon — permettant une participation citoyenne équitable et scalable dans une vraie démocratie locale.

## Le pitch

Nous affinons ce message pour notre présentation de hackathon :

- **Problème** : Le bruit, la toxicité et les hors-sujets tuent les plateformes participatives. La charte d'Audierne2026 existe mais nécessite une application à grande échelle.
- **Solution** : Forseti461 — gardien IA de la charte avec modération explicable et constructive.
- **Comment ça marche** : Prompt système optimisé → critères d'évaluation → style de réponse.
- **Impact** : Discussions plus propres → meilleures idées → co-construction de programme municipal renforcée.
- **Tech** : Observabilité OPIK, flux agentiques Gemini, automatisation N8N, expériences quotidiennes.

---

## Essayez vous-même

Naviguez vers l'onglet **Mockup** dans l'application pour :

- Générer des contributions de test avec des violations
- Lancer une validation par lot avec Forseti461
- Exporter les résultats vers les datasets OPIK

**Vos retours sont les bienvenus** — contactez-nous pour collaborer sur les traces OPIK ou les ensembles d'évaluation avant la deadline du hackathon !

---

_Construire la confiance dans la modération IA, une optimisation à la fois._

**Branche :** `feature/logging_system`
**Fichiers clés :**

- `app/agents/forseti/prompts.py` — Prompt système
- `app/processors/mockup_processor.py` — Expériences quotidiennes
- `app/mockup/` — Système de génération de tests
