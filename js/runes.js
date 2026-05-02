// ============================================================
// RUNES — Bonus de champion sélectionné au draft
// ============================================================

// Mettre les images dans assets/runes/<id>.png
// Si img est null (ou fichier absent), l'icône emoji sert de fallback

const RUNES = {
  attaque_rapide: {
    id: 'attaque_rapide', name: 'Attaque Rapide', icon: '⚡', img: 'assets/runes/attaque_rapide.png',
    desc: '3 auto-attaques sur le même ennemi dans le même tour infligent 0,2×AD + 0,2×AP dégâts bruts bonus. (CD 3 tours)'
  },
  vitesse_letale: {
    id: 'vitesse_letale', name: 'Vitesse Létale', icon: '💨', img: 'assets/runes/vitesse_letale.png',
    desc: 'Après 3 tours consécutifs avec au moins 1 AA, gagnez +1 attaque/tour jusqu\'au 1er tour sans AA.'
  },
  pied_leger: {
    id: 'pied_leger', name: 'Pied Léger', icon: '🦶', img: 'assets/runes/pied_leger.png',
    desc: 'Une AA soigne 100+0,4×AD+0,4×AP HP et donne +1 PM ce tour. (CD 4 tours)'
  },
  le_conquerant: {
    id: 'le_conquerant', name: 'Le Conquérant', icon: '🏆', img: 'assets/runes/le_conquerant.png',
    desc: 'Chaque sort ou AA : +8 AD +8 AP (max 6 stacks). Au 6e stack, +15% vol de vie. Expire après 2 tours sans infliger de dégâts.'
  },
  decharge: {
    id: 'decharge', name: 'Décharge', icon: '🌩', img: 'assets/runes/decharge.png',
    desc: 'Toucher un ennemi avec 2 sorts dans le même tour : 60+0,4×AD+0,4×AP dégâts magiques bonus. (CD 4 tours)'
  },
  collecteur_dames: {
    id: 'collecteur_dames', name: "Collecteur d'Âme", icon: '💀', img: 'assets/runes/collecteur_dames.png',
    desc: "Infliger des dégâts à un ennemi sous 40% de ses HP max : +2 AD et +2 AP permanents."
  },
  epees_en_cercle: {
    id: 'epees_en_cercle', name: 'Épées en Cercle', icon: '🗡', img: 'assets/runes/epees_en_cercle.png',
    desc: 'La 1ère AA sur un ennemi rend les AAs suivantes sur cette cible ce tour +20 dégâts bruts. (CD 4 tours)'
  },
  assistant_magique: {
    id: 'assistant_magique', name: 'Assistant Magique', icon: '🧙', img: 'assets/runes/assistant_magique.png',
    desc: 'Soigner ou bouclier un allié lui confère aussi un bouclier de 100+0,3×AP pendant 3 tours. (CD 5 tours)'
  },
  comete: {
    id: 'comete', name: 'Comète', icon: '☄', img: 'assets/runes/comete.png',
    desc: "Sort : pose une comète sur la cible. Si elle termine son tour au même endroit : −80+0,6×AP dégâts magiques. (CD 4 tours)"
  },
  vitesse_assassin: {
    id: 'vitesse_assassin', name: "Vitesse de l'Assassin", icon: '🥷', img: 'assets/runes/vitesse_assassin.png',
    desc: "Infliger ≥25% des HP max d'un ennemi en 1 tour : +3 PM ce tour. (CD 4 tours)"
  },
  toucher_sombre: {
    id: 'toucher_sombre', name: 'Toucher Sombre', icon: '🌑', img: 'assets/runes/toucher_sombre.png',
    desc: "Sort sur ennemi : DOT 20+0,1×AP pendant 1 tour. Sa durée est automatiquement étendue à la durée du plus long DOT de la cible."
  },
  poing_de_destinee: {
    id: 'poing_de_destinee', name: 'Poing de Destinée', icon: '👊', img: 'assets/runes/poing_de_destinee.png',
    desc: '1ère AA/tour : +2% HP max dégâts physiques, soin identique, +50 HP max (mêlée) ou +20 HP max (distance).'
  },
  retour_de_baton: {
    id: 'retour_de_baton', name: 'Retour de Bâton', icon: '🪃', img: 'assets/runes/retour_de_baton.png',
    desc: 'Ralentir/immobiliser un ennemi : +20% Armure et RM pendant 2 tours, puis −4% HP max dégâts magiques aux ennemis à ≤4 cases. (CD 5 tours)'
  },
  gardien: {
    id: 'gardien', name: 'Gardien', icon: '🛡', img: 'assets/runes/gardien.png',
    desc: "Un allié à <5 cases subit >25% de ses HP max en 1 tour : réduit ses dégâts reçus de 20% pendant 3 tours. (CD 5 tours)"
  },
  triangle_glacial: {
    id: 'triangle_glacial', name: 'Triangle Glacial', icon: '❄', img: 'assets/runes/triangle_glacial.png',
    desc: 'Vos ralentissements durent 1 tour de plus.'
  },
  premiere_touche: {
    id: 'premiere_touche', name: 'Première Touche', icon: '💰', img: 'assets/runes/premiere_touche.png',
    desc: 'Infliger des dégâts à un ennemi : +7% dégâts ce tour et 50% des dégâts en or. (CD 5 tours)'
  }
};

const RUNE_LIST = Object.values(RUNES);
