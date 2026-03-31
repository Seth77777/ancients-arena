// ============================================================
// EQUIPMENT CATALOG
// ============================================================

const EQUIPMENT = {

  // ─── TIER 1 ────────────────────────────────────────────────

  black_scythe:    { tier: 1, categories: [], name: 'Faux Noire',            icon: 'img/items/black_scythe.png',    combineCost: 500, recipe: [], isStarter: true,
                     stats: { ad: 5, goldPerTurn: 20 },
                     passive: 'Gagnez 20 golds supplémentaires par tour.' },

  minor_mage_ring: { tier: 1, categories: [], name: 'Anneau du Mage Mineur', icon: 'img/items/minor_mage_ring.png', combineCost: 400, recipe: [], isStarter: true,
                     stats: { ap: 10, manaRegen: 10 },
                     passive: 'Au début de votre tour, si votre mana est inférieur à 25% de votre mana max, récupérez 5% de votre mana manquant.' },

  soldier_dagger:  { tier: 1, categories: [], name: 'Dague du Soldat',       icon: 'img/items/soldier_dagger.png',  combineCost: 450, recipe: [], isStarter: true,
                     stats: { ad: 10, lifeSteal: 4 },
                     passive: 'Si vous attaquez au corps à corps (distance 1), vous gagnez un bouclier de 15 HP jusqu\'à votre prochain tour.' },

  magic_ring:      { tier: 1, categories: [], name: 'Anneau Magique',        icon: 'img/items/magic_ring.png',      combineCost: 450, recipe: [], isStarter: true,
                     stats: { ap: 15, maxHP: 70 },
                     passive: 'Finir votre tour dans une zone à gold vous rapporte 5% d\'or supplémentaire si aucun allié ne s\'y trouve.' },

  basic_shield:    { tier: 1, categories: [], name: 'Bouclier Basique',      icon: 'img/items/basic_shield.png',    combineCost: 400, recipe: [], isStarter: true,
                     stats: { maxHP: 100, armor: 3, mr: 3 },
                     passive: 'Au début de votre tour, si vos HP sont inférieurs à 30% de votre max, récupérez 5% de vos HP manquants.' },

  mana_tear:       { tier: 1, categories: [], name: 'Larme de Mana',         icon: 'img/items/mana_tear.png',       combineCost: 400, recipe: [],
                     stats: { maxMana: 200, manaOnSpell: 15, manaOnSpellMax: 300 },
                     passive: 'Chaque sort lancé augmente votre Mana max de 15 (max +300 via ce passif).' },

  simple_boots:    { tier: 1, categories: [], name: 'Bottes Simples',        icon: 'img/items/simple_boots.png',    combineCost: 400, recipe: [],
                     isBoots: true,
                     stats: { pm: 1 } },

  reinforced_boots: { tier: 2, categories: [], name: 'Bottes Renforcées',       icon: 'img/items/reinforced_boots.png', combineCost: 800, recipe: ['simple_boots'],
                      isBoots: true,
                      stats: { pm: 2, armor: 10 },
                      passive: 'Augmente votre régénération de HP de 50%.' },

  anti_spell_boots: { tier: 2, categories: [], name: 'Bottes Anti-Sort',        icon: 'img/items/anti_spell_boots.png', combineCost: 800, recipe: ['simple_boots'],
                      isBoots: true,
                      stats: { pm: 2, mr: 10 },
                      passive: 'Augmente votre régénération de HP de 50%.' },

  sorcerer_boots:  { tier: 2, categories: [], name: 'Bottes du Sorcier',        icon: 'img/items/sorcerer_boots.png', combineCost: 800, recipe: ['simple_boots'],
                     isBoots: true,
                     stats: { pm: 2, ap: 15 },
                     passive: 'Ignore 5% de la résistance magique adverse (peut devenir négative). Augmente votre régénération de mana de 50%.' },

  boots_of_celerity: { tier: 2, categories: [], name: 'Bottes de Célérité',      icon: 'img/items/boots_of_celerity.png', combineCost: 800, recipe: ['simple_boots'],
                       isBoots: true,
                       stats: { pm: 2, maxHP: 100 },
                       passive: 'Réduit de 1 supplémentaire le CD de votre ultime (sort au CD le plus élevé). Augmente votre régénération de HP de 50%.' },

  speed_boots:     { tier: 2, categories: [], name: 'Bottes de Grande Vitesse', icon: 'img/items/speed_boots.png',  combineCost: 800, recipe: ['simple_boots'],
                     isBoots: true,
                     stats: { pm: 2 },
                     passive: 'Si vous n\'avez pas infligé de dégâts à un héros lors de votre dernier tour, recevez +1 PM ce tour. Augmente votre régénération de HP de 25% et de mana de 25%.' },

  bottes_attaquant: { tier: 2, categories: [], name: 'Bottes de l\'Attaquant',  icon: 'img/items/bottes_attaquant.png', combineCost: 800, recipe: ['simple_boots'],
                      isBoots: true,
                      stats: { pm: 2, ad: 35 },
                      passive: 'Ignore 5% de l\'armure adverse (peut devenir négative).' },

  linked_names:    { tier: 1, categories: [], name: 'Nos Noms Sont Liés',    icon: 'img/items/linked_names.png',    combineCost: 300, recipe: [], isStarter: true,
                     stats: { maxHP: 80, healEfficiency: 10, goldSharePct: 20 },
                     passive: '+10% d\'efficacité des soins. 20% des golds gagnés sont aussi donnés à votre allié le plus proche.',
                     roleRestriction: 'support',
                     roleRestrictionNote: 'Réservé aux Supports.' },

  short_sword:     { tier: 1, categories: [], name: 'Petite Épée',           icon: 'img/items/short_sword.png',     combineCost: 400, recipe: [],
                     stats: { ad: 10 } },

  grande_pioche:   { tier: 2, categories: [], name: 'Grande Pioche',          icon: 'img/items/grande_pioche.png',   combineCost: 350, recipe: ['short_sword'],
                     stats: { ad: 30 } },

  dague_destructrice: { tier: 2, categories: [], name: 'Dague Destructrice',    icon: 'img/items/dague_destructrice.png', combineCost: 500, recipe: ['short_sword'],
                        stats: { ad: 25 },
                        passive: 'Ignore 5% de l\'armure adverse (peut devenir négative).' },

  arc_percant:          { tier: 2, categories: [], name: 'Arc Perçant',           icon: 'img/items/arc_percant.png',          combineCost: 750, recipe: ['short_sword'],
                          stats: { ad: 25 },
                          passive: 'Ignore 20% de l\'armure de la cible lorsque vous lui infligez des dégâts physiques.' },

  arc_perforant_anges:  { tier: 3, categories: ['dpt'], name: 'Arc Perforant des Anges', icon: 'img/items/arc_perforant_anges.png', combineCost: 700,
                          recipe: ['arc_percant', 'small_crit_cape'],
                          stats: { ad: 55, critChance: 20 },
                          passive: 'Ignore 35% de l\'armure de la cible lorsque vous lui infligez des dégâts physiques.' },

  coeur_de_courage:     { tier: 2, categories: [], name: 'Cœur de Courage',        icon: 'img/items/coeur_de_courage.png',     combineCost: 500, recipe: ['life_crystal'],
                          stats: { maxHP: 180, healEfficiency: 10 },
                          passive: 'L\'efficacité de vos soins augmente de 10%.' },

  protection_divine:    { tier: 3, categories: ['support'], name: 'Protection Divine',      icon: 'img/items/protection_divine.png',    combineCost: 0,
                          recipe: ['coeur_de_courage', 'baton_magique'],
                          stats: { ap: 50, maxHP: 230, healEfficiency: 10 },
                          passive: 'Améliore vos soins de 10%. Lorsqu\'un allié à moins de 10 cases subit un stun, ce stun est annulé (7 tours de CD).' },

  coeur_de_vie:         { tier: 2, categories: ['bruiser'], name: 'Cœur de Vie',           icon: 'img/items/coeur_de_vie.png',         combineCost: 250, recipe: ['life_crystal', 'regen_necklace'],
                          stats: { maxHP: 220, hpRegen: 15 } },

  ceinture_de_vie:      { tier: 2, categories: ['bruiser'], name: 'Ceinture de Vie',        icon: 'img/items/ceinture_de_vie.png',      combineCost: 450, recipe: ['life_crystal'],
                          stats: { maxHP: 280 } },

  armure_esprit_magique: { tier: 3, categories: ['bruiser'], name: 'Armure de l\'Esprit Magique', icon: 'img/items/armure_esprit_magique.png', combineCost: 550,
                           recipe: ['coeur_de_vie', 'cape_antimagie_moyenne'],
                           stats: { maxHP: 550, mr: 15, healEfficiency: 25 },
                           passive: 'Tous vos soins et régénérations sont améliorés de 25%.' },

  armure_de_la_vie:     { tier: 3, categories: ['bruiser'], name: 'Armure de la Vie',       icon: 'img/items/armure_de_la_vie.png',     combineCost: 800,
                          recipe: ['coeur_de_vie', 'ceinture_de_vie'],
                          stats: { maxHP: 700, hpRegen: 25 },
                          passive: 'Si vous n\'avez pas reçu de dégâts lors de votre dernier tour de jeu, vous régénérez 10% de vos HP manquants.' },

  plastron_brulant:     { tier: 2, categories: ['bruiser'], name: 'Plastron Brûlant',      icon: 'img/items/plastron_brulant.png',     combineCost: 500, recipe: ['small_armor'],
                          stats: { armor: 15, maxHP: 70 },
                          passive: 'Subir des dégâts physiques applique Hémorragie sur l\'attaquant pendant 1 tour (soins −50%).' },

  boule_de_piques:      { tier: 2, categories: ['bruiser'], name: 'Boule de Piques',        icon: 'img/items/boule_de_piques.png',      combineCost: 500, recipe: ['life_crystal'],
                          stats: { maxHP: 250 },
                          passive: 'Renvoie 20% des dégâts physiques subis (après calcul d\'armure) à l\'attaquant.' },

  armure_de_stalnoth:   { tier: 3, categories: ['bruiser'], name: 'Armure de Stal\'noth',   icon: 'img/items/armure_de_stalnoth.png',   combineCost: 600,
                          recipe: ['boule_de_piques', 'plastron_brulant'],
                          stats: { maxHP: 450, armor: 17 },
                          passive: 'Subir des dégâts physiques applique Hémorragie sur l\'attaquant. Renvoie (20 + max(0, Armure×0,2))% des dégâts physiques subis à l\'attaquant.' },

  pistolet_magique:     { tier: 3, categories: ['dpt', 'mage'], name: 'Pistolet Magique',    icon: 'img/items/pistolet_magique.png',  combineCost: 400,
                          recipe: ['sceptre_de_vie', 'alternateur_de_puissance', 'petit_grimoire'],
                          stats: { ad: 40, ap: 80, lifeSteal: 10 },
                          passive: 'Vos sorts ayant à la fois un ratio AD et un ratio AP infligent 20% de dégâts supplémentaires.' },

  lame_antimagie:       { tier: 2, categories: [], name: 'Lame Antimagie',         icon: 'img/items/lame_antimagie.png',       combineCost: 350, recipe: ['short_sword', 'small_antimagic_cape'],
                          stats: { ad: 30, mr: 10 } },

  combattant_antimage:  { tier: 3, categories: ['dpt', 'bruiser', 'assassin'], name: 'Combattant Anti-Mage',  icon: 'img/items/combattant_antimage.png',  combineCost: 500,
                          recipe: ['lame_antimagie', 'lame_antimagie'],
                          stats: { ad: 60, mr: 22 },
                          passive: 'Réduit tous les dégâts magiques reçus de 0,1×AD (appliqué après calcul des résistances).' },

  sceptre_de_vie:  { tier: 2, categories: [], name: 'Sceptre de Vie',          icon: 'img/items/sceptre_de_vie.png',   combineCost: 500, recipe: ['short_sword'],
                     stats: { ad: 20, lifeSteal: 10 } },

  lame_du_diable:  { tier: 3, categories: ['dpt'], name: 'Lame du Diable',     icon: 'img/items/lame_du_diable.png',  combineCost: 0,
                     recipe: ['sceptre_de_vie', 'white_walker_hammer'],
                     stats: { ad: 50, lifeSteal: 12 },
                     passive: 'Chaque attaque de base infligée à un ennemi vous octroie 1 PM ce tour. Inflige également des dégâts bruts bonus égaux à 6% des HP max de la cible.' },

  grosse_lame:     { tier: 2, categories: [], name: 'Grosse Lame',           icon: 'img/items/grosse_lame.png',     combineCost: 900, recipe: ['short_sword'],
                     stats: { ad: 45 } },

  lame_d_infini:   { tier: 3, categories: ['dpt'], name: "Lame d'Infini",        icon: 'img/items/lame_d_infini.png',   combineCost: 400,
                     recipe: ['grande_pioche', 'grosse_lame', 'small_crit_cape'],
                     stats: { ad: 90, critChance: 20 },
                     passive: 'Vos auto-attaques et sorts physiques critiques infligent 200% de dégâts au lieu de 150%.' },

  lame_electrique: { tier: 3, categories: ['dpt'], name: 'Lame Électrique',       icon: 'img/items/lame_electrique.png', combineCost: 600,
                     recipe: ['grosse_lame', 'small_crit_cape'],
                     stats: { ad: 60, critChance: 15 },
                     passive: 'Vos attaques de base infligent 25 dégâts magiques supplémentaires à la cible et à tous les ennemis en chaîne (chaque ennemi à moins de 4 cases d\'un ennemi déjà touché est également touché).' },

  lame_du_ninja:         { tier: 3, categories: ['dpt', 'assassin'], name: 'Lame du Ninja',              icon: 'img/items/lame_du_ninja.png',        combineCost: 550,
                           recipe: ['dague_destructrice', 'grande_pioche'],
                           stats: { ad: 70 },
                           passive: 'Ignore 7% de l\'armure adverse (peut devenir négative). Si vous n\'avez pas infligé de dégâts à un héros ennemi lors de votre précédent tour, vous gagnez 1 PM pour ce tour.' },

  lame_tueuse_boucliers: { tier: 3, categories: ['dpt'], name: 'Lame Tueuse de Boucliers', icon: 'img/items/lame_tueuse_boucliers.png', combineCost: 600,
                           recipe: ['dague_destructrice', 'grande_pioche'],
                           stats: { ad: 60 },
                           passive: 'Ignore 7% de l\'armure adverse (peut devenir négative). Lorsque vous attaquez une cible qui a un bouclier, les dégâts infligés sont doublés contre le bouclier (normaux contre les HP).' },

  canon_de_feu:    { tier: 3, categories: ['dpt'], name: 'Canon de Feu',          icon: 'img/items/canon_de_feu.png',    combineCost: 500,
                     recipe: ['epees_croisees', 'distant_vision', 'short_sword'],
                     stats: { ad: 30, critChance: 20, bonusSpellRange: 1, po: 1 },
                     passive: 'Votre attaque de base gagne 1 PO.' },

  epee_double_feu: { tier: 3, categories: ['dpt'], name: 'Épée Double de Feu',   icon: 'img/items/epee_double_feu.png', combineCost: 400,
                     recipe: ['life_crystal', 'grande_pioche', 'petit_grimoire'],
                     stats: { ad: 35, ap: 20, maxHP: 250, extraAutoAttacks: 1 },
                     passive: 'Vous pouvez effectuer 2 attaques de base par tour.' },

  // ─── TIER 2 — Générique (suite) ─────────────────────────────

  lame_ensanglanté: { tier: 2, categories: [], name: 'Lame Ensanglantée',       icon: 'img/items/lame_ensanglantee.png', combineCost: 450,
                      recipe: ['short_sword'],
                      stats: { ad: 18 },
                      passive: 'Vos dégâts physiques appliquent Hémorragie pendant 1 tour aux cibles touchées (soins −50%).' },

  epee_cinglante:  { tier: 2, categories: [], name: 'Épée Cinglante',         icon: 'img/items/epee_cinglante.png',  combineCost: 400,
                     recipe: ['short_sword', 'short_sword'],
                     stats: { ad: 25 },
                     passive: 'Chaque sort ou attaque de base réduit l\'armure de la cible de 3% de son armure totale (max 20%) pendant 5 tours.' },

  couperet_du_demon: { tier: 3, categories: ['dpt', 'bruiser'], name: 'Couperet du Démon', icon: 'img/items/couperet_du_demon.png', combineCost: 400,
                       recipe: ['epee_cinglante', 'white_walker_hammer'],
                       stats: { ad: 55, maxHP: 350 },
                       passive: 'Fuite — Chaque attaque de base infligée à un ennemi vous octroie 1 PM supplémentaire ce tour. Brise Armure — Chaque sort ou attaque de base réduit l\'armure de la cible de 6% de son armure totale (max 30%) pendant 5 tours.' },

  marteau_sinad:   { tier: 2, categories: [], name: 'Marteau de Sinad',       icon: 'img/items/marteau_sinad.png',   combineCost: 350,
                     recipe: ['short_sword', 'short_sword'],
                     stats: { ad: 35, cdReduction: 1 },
                     passive: 'Réduit de 1 le CD de tous vos sorts lors de leur utilisation (minimum 1 ; minimum 2 pour les sorts infligeant un stun).' },

  life_crystal:    { tier: 1, categories: [], name: 'Cristal de Vie',        icon: 'img/items/life_crystal.png',    combineCost: 400, recipe: [],
                     stats: { maxHP: 100 } },

  mana_crystal:    { tier: 1, categories: [], name: 'Cristal de Mana',       icon: 'img/items/mana_crystal.png',    combineCost: 300, recipe: [],
                     stats: { maxMana: 80 } },

  regen_necklace:  { tier: 1, categories: [], name: 'Collier Régénérant',    icon: 'img/items/regen_necklace.png',  combineCost: 200, recipe: [],
                     stats: { hpRegen: 10 } },

  mana_necklace:   { tier: 1, categories: [], name: 'Collier de Mana',       icon: 'img/items/mana_necklace.png',   combineCost: 240, recipe: [],
                     stats: { manaRegen: 10 } },

  time_glass:      { tier: 1, categories: [], name: 'Sablier Temporel',      icon: 'img/items/time_glass.png',      combineCost: 500, recipe: [],
                     stats: { cdReduction: 1 },
                     passive: 'Réduit de 1 le CD de tous vos sorts lors de leur utilisation (minimum 1 ; minimum 2 pour les sorts infligeant un stun).' },

  distant_vision:  { tier: 1, categories: [], name: 'Vision Lointaine',      icon: 'img/items/distant_vision.png',  combineCost: 500, recipe: [],
                     stats: { bonusSpellRange: 1 },
                     passive: 'Augmente la portée de tous vos sorts de 1.' },

  small_crit_cape:      { tier: 1, categories: [], name: 'Petite Cape Critique',   icon: 'img/items/small_crit_cape.png',   combineCost: 400, recipe: [],
                          stats: { critChance: 10 },
                          passive: 'Les attaques de base ont 10% de chance d\'infliger un coup critique (+50% de dégâts).' },

  epees_croisees:       { tier: 2, categories: [], name: 'Épées Croisées',          icon: 'img/items/epees_croisees.png',    combineCost: 700, recipe: ['small_crit_cape'],
                          stats: { critChance: 15 },
                          passive: 'Jambes de Feu — Au début de votre tour, gagnez 1 PM ce tour (3 tours de CD).' },

  small_antimagic_cape: { tier: 1, categories: [], name: 'Petite Cape Antimagie',  icon: 'img/items/small_antimagic_cape.png', combineCost: 400, recipe: [],
                          stats: { mr: 7 } },

  cape_antimagie_moyenne: { tier: 2, categories: [], name: 'Cape Moyenne d\'Antimagie', icon: 'img/items/cape_antimagie_moyenne.png', combineCost: 350,
                            recipe: ['life_crystal', 'small_antimagic_cape'],
                            stats: { maxHP: 180, mr: 12 } },

  small_armor:          { tier: 1, categories: [], name: 'Petite Armure',           icon: 'img/items/small_armor.png',       combineCost: 400, recipe: [],
                          stats: { armor: 7 } },

  moyenne_armure:       { tier: 2, categories: [], name: 'Moyenne Armure',           icon: 'img/items/moyenne_armure.png',    combineCost: 300, recipe: ['small_armor'],
                          stats: { armor: 12 } },

  flamme_intense:       { tier: 2, categories: ['bruiser'], name: 'Flamme Intense',  icon: 'img/items/flamme_intense.png',    combineCost: 350, recipe: ['life_crystal'],
                          stats: { maxHP: 200 },
                          passive: 'Les ennemis présents sur une case adjacente à la fin de votre tour subissent 1% de vos HP max en dégâts magiques.' },

  flamme_du_soleil_flamboyant: { tier: 3, categories: ['bruiser'], name: 'Flamme du Soleil Flamboyant', icon: 'img/items/flamme_du_soleil_flamboyant.png', combineCost: 350,
                                 recipe: ['flamme_intense', 'moyenne_armure', 'life_crystal'],
                                 stats: { maxHP: 450, armor: 12 },
                                 passive: 'Les ennemis présents sur une case adjacente à la fin de votre tour subissent 3% de vos HP max en dégâts magiques.' },

  petit_grimoire:  { tier: 1, categories: [], name: 'Petit Grimoire',          icon: 'img/items/petit_grimoire.png',   combineCost: 400, recipe: [],
                     stats: { ap: 15 } },

  barriere_de_jade:    { tier: 2, categories: ['mage', 'support'], name: 'Barrière de Jade', icon: 'img/items/barriere_de_jade.png', combineCost: 0,
                         recipe: ['petit_grimoire', 'petit_grimoire', 'small_antimagic_cape'],
                         stats: { ap: 45, mr: 10 } },

  voile_antimagie:     { tier: 3, categories: ['mage', 'support'], name: 'Voile Antimagie',   icon: 'img/items/voile_antimagie.png',   combineCost: 400,
                         recipe: ['barriere_de_jade', 'gros_baton_magique'],
                         stats: { ap: 100, mr: 12 },
                         passive: 'Le Voile — Si vous ne recevez pas de dégâts pendant 4 tours, le prochain sort que vous subirez sera annulé (les auto-attaques ne comptent pas).' },

  compagnon_fidele:    { tier: 3, categories: ['mage', 'support'], name: 'Compagnon Fidèle', icon: 'img/items/compagnon_fidele.png', combineCost: 350,
                         recipe: ['barriere_de_jade', 'coeur_de_courage'],
                         stats: { ap: 55, mr: 10, healEfficiency: 15 },
                         passive: 'L\'efficacité de vos soins est améliorée de 15%. Vous gagnez 80 golds supplémentaires par tour lorsque vous n\'êtes pas sur une zone à golds.' },

  // ─── TIER 2 — Mage ──────────────────────────────────────────

  alternateur_de_puissance: { tier: 2, categories: ['mage'], name: 'Alternateur de Puissance', icon: 'img/items/alternateur_de_puissance.png', combineCost: 300,
                              recipe: ['petit_grimoire', 'petit_grimoire'],
                              stats: { ap: 45 },
                              passive: 'Infliger des dégâts magiques à un héros ennemi lui inflige 65 dégâts magiques bonus (CD 4 tours).' },

  grimoire_magique: { tier: 2, categories: [], name: 'Grimoire Magique',         icon: 'img/items/grimoire_magique.png',  combineCost: 500, recipe: ['petit_grimoire'],
                      stats: { ap: 25, maxMana: 100 },
                      passive: 'Récupérez 50 points de mana s\'il vous reste au moins 1 PM à la fin de votre tour.' },

  furie_magique:      { tier: 3, categories: ['mage'], name: 'Furie Magique',           icon: 'img/items/furie_magique.png',      combineCost: 400,
                        recipe: ['alternateur_de_puissance', 'gros_baton_magique'],
                        stats: { ap: 130 },
                        passive: 'Ignore 5% de la résistance magique adverse (peut devenir négative). Flammes de Furie — Vos dégâts magiques contre des cibles ayant moins de 40% de leurs HP max infligent 20% de dégâts en plus.' },

  gros_baton_magique: { tier: 2, categories: ['mage'], name: 'Gros Bâton Magique',    icon: 'img/items/gros_baton_magique.png', combineCost: 500,
                        recipe: ['baton_magique', 'petit_grimoire'],
                        stats: { ap: 80 } },

  chapeau_de_dieu:    { tier: 3, categories: ['mage'], name: 'Chapeau de Dieu',       icon: 'img/items/chapeau_de_dieu.png',    combineCost: 0,
                        recipe: ['gros_baton_magique', 'baton_magique'],
                        stats: { ap: 120 },
                        passive: 'Votre AP totale est multipliée par 1,4 (calculé après ajout des stats de cet item).' },

  baton_magique:   { tier: 2, categories: ['mage'], name: 'Bâton Magique',            icon: 'img/items/baton_magique.png',    combineCost: 400,
                     recipe: ['petit_grimoire'],
                     stats: { ap: 35 } },

  boule_du_demon:  { tier: 2, categories: ['mage'], name: 'Boule du Démon',              icon: 'img/items/boule_du_demon.png',   combineCost: 400,
                     recipe: ['petit_grimoire'],
                     stats: { ap: 25 },
                     passive: 'Vos dégâts magiques appliquent Hémorragie à la cible pendant 1 tour (soins −50%).' },

  feu_follet:      { tier: 2, categories: [], name: 'Feu Follet',                       icon: 'img/items/feu_follet.png',       combineCost: 400,
                     recipe: ['petit_grimoire'],
                     stats: { ap: 30, pm: 1 } },

  livre_incantations: { tier: 2, categories: [], name: "Livre d'Incantations",          icon: 'img/items/livre_incantations.png', combineCost: 400,
                        recipe: ['petit_grimoire'],
                        stats: { ap: 30, cdReduction: 1 } },

  masque_hante:       { tier: 2, categories: ['mage', 'bruiser'], name: 'Masque Hanté',        icon: 'img/items/masque_hante.png',       combineCost: 300,
                        recipe: ['petit_grimoire', 'life_crystal'],
                        stats: { ap: 30, maxHP: 200 } },

  masque_de_larme:    { tier: 3, categories: ['mage', 'bruiser'], name: 'Masque de Larme',     icon: 'img/items/masque_de_larme.png',    combineCost: 0,
                        recipe: ['masque_hante', 'baton_magique'],
                        stats: { ap: 75, maxHP: 300 },
                        passive: 'Toucher un ennemi avec un sort lui inflige 2% de ses HP max en dégâts bruts par tour pendant 3 tours.' },

  sceptre_du_malin:   { tier: 3, categories: ['mage'], name: 'Sceptre du Malin',           icon: 'img/items/sceptre_du_malin.png',   combineCost: 600,
                        recipe: ['grimoire_magique', 'baton_magique'],
                        stats: { ap: 90, maxMana: 500, manaRegen: 15 },
                        passive: 'Réduit de 1 le CD de votre ultime lors de son utilisation (minimum 1). Si votre ultime inflige des dégâts magiques, les ennemis touchés reçoivent 20 + 0,15×AP dégâts magiques supplémentaires.' },

  torche_sombre:      { tier: 3, categories: ['mage'], name: 'Torche Sombre',              icon: 'img/items/torche_sombre.png',      combineCost: 400,
                        recipe: ['grimoire_magique', 'grimoire_magique'],
                        stats: { ap: 80, cdReduction: 1, maxMana: 500, manaRegenPct: 25 },
                        passive: 'Réduit de 1 le CD de tous vos sorts lors de leur utilisation (minimum 1 ; minimum 2 pour les sorts infligeant un stun). Toucher un ennemi avec un sort lui inflige 20 + 0,02×AP dégâts magiques par tour pendant 3 tours.' },

  casque_necrometien: { tier: 3, categories: [], name: 'Casque du Nécromentien',        icon: 'img/items/casque_necrometien.png', combineCost: 600,
                        recipe: ['feu_follet', 'livre_incantations'],
                        stats: { ap: 75, cdReduction: 1, pm: 1 },
                        passive: 'Toucher Magique — Toucher une cible avec un sort infligeant des dégâts magiques vous donne +1 PM pour ce tour (une fois par sort).' },

  // ─── TIER 2 — Générique ─────────────────────────────────────

  black_blade:         { tier: 2, categories: [], name: 'Lame Noire',                 icon: 'img/items/black_blade.png',         combineCost: 350,
                         recipe: ['short_sword', 'life_crystal'],
                         stats: { ad: 30, maxHP: 140 } },

  // ─── TIER 2 — Bruiser / Tank ────────────────────────────────

  white_walker_hammer: { tier: 2, categories: ['bruiser'], name: 'Marteau du Marcheur Blanc', icon: 'img/items/white_walker_hammer.png', combineCost: 350,
                         recipe: ['life_crystal', 'short_sword'],
                         stats: { maxHP: 120, ad: 15 },
                         passive: 'Chaque attaque de base infligée à un ennemi vous octroie 1 PM supplémentaire ce tour.' },

  blue_blade:          { tier: 2, categories: ['bruiser'], name: 'Lame Bleue',                icon: 'img/items/blue_blade.png',          combineCost: 850,
                         recipe: ['mana_crystal'],
                         stats: { maxMana: 80 },
                         passive: 'Vos attaques de base renforcées par un sort infligent 15% de dégâts supplémentaires.' },

  bouclier_gele:       { tier: 2, categories: [], name: 'Bouclier Gelé',               icon: 'img/items/bouclier_gele.png',       combineCost: 300,
                         recipe: ['small_armor', 'mana_crystal'],
                         stats: { maxMana: 130, manaRegen: 10, armor: 13 } },

  gantelet_refroidissant: { tier: 3, categories: ['bruiser'], name: 'Gantelet Refroidissant', icon: 'img/items/gantelet_refroidissant.png', combineCost: 0,
                            recipe: ['bouclier_gele', 'blue_blade'],
                            stats: { maxMana: 250, manaRegen: 15, armor: 15 },
                            passive: 'Gelure — Vos attaques de base renforcées infligent 15% de dégâts supplémentaires et ralentissent la cible (−1 PM au prochain tour). La zone autour de la cible augmente avec votre armure totale (≥20% : 1-3-1 ; ≥30% : 1-3-5-3-1, cappé à 40%).' },

  couronne_de_la_reine: { tier: 3, categories: ['support', 'mage'], name: 'Couronne de la Reine', icon: 'img/items/couronne_de_la_reine.png', combineCost: 200,
                          recipe: ['coeur_de_courage', 'mana_tear', 'life_crystal'],
                          stats: { maxHP: 250, maxMana: 300, manaRegenPct: 25, healEfficiency: 15, manaOnSpell: 15, manaOnSpellMax: 700 },
                          passive: 'Chaque sort lancé augmente votre Mana max de 15 (max +700 au total). Lorsque le cap est atteint, la Couronne se transforme en Diadème de la Reine. Vous gagnez 80 golds supplémentaires par tour hors zone à golds.' },

  diademe_de_la_reine: { tier: 4, categories: ['support', 'mage'], name: 'Diadème de la Reine', icon: 'img/items/diademe_de_la_reine.png', combineCost: 0,
                         recipe: [], notBuyable: true,
                         stats: { maxHP: 250, maxMana: 300, manaRegenPct: 25, healEfficiency: 15, manaOnSpell: 15, manaOnSpellMax: 700 },
                         passive: 'Vous gagnez 80 golds supplémentaires par tour hors zone à golds. Vos soins sont augmentés de 3% de votre Mana max.' },

  sceptre_de_mana: { tier: 3, categories: ['mage'], name: 'Sceptre de Mana',         icon: 'img/items/sceptre_de_mana.png',     combineCost: 450,
                     recipe: ['grimoire_magique', 'mana_tear', 'petit_grimoire'],
                     stats: { ap: 60, cdReduction: 1, maxMana: 300, manaOnSpell: 15, manaOnSpellMax: 700 },
                     passive: 'Chaque sort lancé augmente votre Mana max de 15 (max +700 au total). Lorsque le cap est atteint, le Sceptre se transforme en Sceptre de l\'Ange.' },

  sceptre_ange:    { tier: 4, categories: ['mage'], name: 'Sceptre de l\'Ange',      icon: 'img/items/sceptre_ange.png',        combineCost: 0,
                     recipe: [], notBuyable: true,
                     stats: { ap: 60, cdReduction: 1, maxMana: 300, manaOnSpell: 15, manaOnSpellMax: 700 },
                     passive: 'Solde de mana — Vos sorts coûtent 15% de mana en moins. Dernier Recours — Lorsque vos HP tombent sous 30%, vous gagnez un bouclier égal à 35% de votre mana actuel pendant 3 tours (CD 8 tours).' },

  epee_de_mana:    { tier: 3, categories: ['dpt'], name: 'Épée de Mana',             icon: 'img/items/epee_de_mana.png',        combineCost: 500,
                     recipe: ['mana_tear', 'marteau_sinad'],
                     stats: { ad: 35, cdReduction: 1, maxMana: 200, manaOnSpell: 15, manaOnSpellMax: 700 },
                     passive: 'Chaque sort lancé augmente votre Mana max de 15 (max +700 au total). Lorsque le cap est atteint, l\'Épée se transforme en Épée de l\'Ange.' },

  epee_ange:       { tier: 4, categories: ['dpt'], name: 'Épée de l\'Ange',          icon: 'img/items/epee_ange.png',           combineCost: 0,
                     recipe: [], notBuyable: true,
                     stats: { ad: 35, cdReduction: 1, maxMana: 200, manaOnSpell: 15, manaOnSpellMax: 700 },
                     passive: 'Solde de mana — Vos sorts coûtent 15% de mana en moins. Mana Renforçant — Vos attaques de base infligent des dégâts supplémentaires égaux à 3% de votre mana max.' },

  // ─── TIER 3 — Assassin ──────────────────────────────────────

  lame_de_nargoth:     { tier: 3, categories: ['assassin'], name: 'Lame de Nargoth',          icon: 'img/items/lame_de_nargoth.png',     combineCost: 700,
                         recipe: ['black_blade', 'white_walker_hammer'],
                         stats: { ad: 80, maxHP: 250 },
                         passive: 'Ignore 3% d\'armure adverse. Vigilance Sombre : si la cible a moins de 15% d\'armure, vos dégâts sont augmentés de 10%. Chaque attaque de base infligée à un ennemi vous octroie 1 PM ce tour.' },

  // ─── TIER 3 — Mage ──────────────────────────────────────────

  livre_des_morts_vivants: { tier: 3, categories: ['mage'], name: 'Livre des Morts-Vivants', icon: 'img/items/livre_des_morts_vivants.png', combineCost: 550,
                             recipe: ['boule_du_demon', 'baton_magique'],
                             stats: { ap: 80, maxHP: 150 },
                             passive: 'Vos dégâts magiques appliquent Hémorragie à la cible pendant 1 tour (soins −50%).' },

  magic_sword:         { tier: 3, categories: ['mage'], name: 'Épée Magique',              icon: 'img/items/magic_sword.png',         combineCost: 500,
                         recipe: ['baton_magique', 'blue_blade'],
                         stats: { ap: 55 },
                         passive: 'Vos attaques de base renforcées par un sort infligent (15 + 0,05×AP)% de dégâts magiques supplémentaires.' },

  // ─── TIER 3 — Bruiser / Tank ────────────────────────────────

  holy_trinity:        { tier: 3, categories: ['bruiser'], name: 'Trinité Sacrée',            icon: 'img/items/holy_trinity.png',        combineCost: 350,
                         recipe: ['white_walker_hammer', 'blue_blade'],
                         stats: { maxHP: 250, ad: 35, maxMana: 100 },
                         passive: 'Chaque attaque de base infligée à un ennemi vous octroie 1 PM ce tour. Vos attaques renforcées par un sort infligent 15% de dégâts supplémentaires.' },
};

// Assign id to each item
Object.keys(EQUIPMENT).forEach(id => { EQUIPMENT[id].id = id; });

// Compute totalCost recursively (combineCost + all component costs)
function _itemTotalCost(id) {
  const item = EQUIPMENT[id];
  return item.combineCost + item.recipe.reduce((sum, cId) => sum + _itemTotalCost(cId), 0);
}
Object.keys(EQUIPMENT).forEach(id => { EQUIPMENT[id].totalCost = _itemTotalCost(id); });

// Returns a Set of T1 item ids that are direct or transitive components of itemId
function _getAllT1Components(itemId, visited = new Set()) {
  if (visited.has(itemId)) return new Set();
  visited.add(itemId);
  const item = EQUIPMENT[itemId];
  const t1s = new Set();
  item.recipe.forEach(cId => {
    if (EQUIPMENT[cId].tier === 1) {
      t1s.add(cId);
    } else {
      _getAllT1Components(cId, visited).forEach(id => t1s.add(id));
    }
  });
  return t1s;
}
