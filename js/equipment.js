// ============================================================
// EQUIPMENT CATALOG
// ============================================================

const EQUIPMENT = {

  // ─── TIER 1 ────────────────────────────────────────────────

  black_scythe:    { tier: 1, categories: [], name: 'Faux Noire',            icon: 'img/items/black_scythe.png',    combineCost: 500, recipe: [], isStarter: true,
                     stats: { ad: 12, goldPerTurn: 35 },
                     passive: 'Gagnez 35 golds supplémentaires par tour.' },

  minor_mage_ring: { tier: 1, categories: [], name: 'Anneau du Mage Mineur', icon: 'img/items/minor_mage_ring.png', combineCost: 400, recipe: [], isStarter: true,
                     stats: { ap: 10, manaRegenPct: 35 },
                     passive: 'Au début de votre tour, si votre mana est inférieur à 40% de votre mana max, récupérez 8% de votre mana max.' },

  soldier_dagger:  { tier: 1, categories: [], name: 'Dague du Soldat',       icon: 'img/items/soldier_dagger.png',  combineCost: 450, recipe: [], isStarter: true,
                     stats: { ad: 20, lifeSteal: 4 },
                     passive: 'Chaque attaque de base vous octroie un bouclier de 25 HP cumulable jusqu\'à votre prochain tour.' },

  magic_ring:      { tier: 1, categories: [], name: 'Anneau Magique',        icon: 'img/items/magic_ring.png',      combineCost: 450, recipe: [], isStarter: true,
                     stats: { ap: 20, maxHP: 70, hpRegen: 10 },
                     passive: 'Finir votre tour dans une zone à gold vous rapporte 10% d\'or supplémentaire si aucun allié ne s\'y trouve.' },

  basic_shield:    { tier: 1, categories: [], name: 'Bouclier Basique',      icon: 'img/items/basic_shield.png',    combineCost: 400, recipe: [], isStarter: true,
                     stats: { maxHP: 100, hpRegen: 18 },
                     passive: 'Au début de votre tour, si vos HP sont inférieurs à 50% de votre max, récupérez 8% de vos HP manquants.' },

  petit_arc:       { tier: 1, categories: ['utilitaire'], name: 'Petit Arc',             icon: 'img/items/petit_arc.png',       combineCost: 800, recipe: [],
                     stats: { extraAutoAttacks: 1 } },

  mana_tear:       { tier: 1, categories: [], name: 'Larme de Mana',         icon: 'img/items/mana_tear.png',       combineCost: 400, recipe: [],
                     stats: { maxMana: 200, manaOnSpell: 15, manaOnSpellMax: 300, manaRegenPct: 25 },
                     passive: 'Chaque sort lancé augmente votre Mana max de 15 (max +300 via ce passif).' },

  simple_boots:    { tier: 1, categories: [], name: 'Bottes Simples',        icon: 'img/items/simple_boots.png',    combineCost: 400, recipe: [],
                     isBoots: true,
                     stats: { pm: 1 } },

  reinforced_boots: { tier: 2, categories: [], name: 'Bottes Renforcées',       icon: 'img/items/reinforced_boots.png', combineCost: 800, recipe: ['simple_boots'],
                      isBoots: true,
                      stats: { pm: 2, armor: 10, hpRegenPct: 100 },
                      passive: 'Augmente votre régénération de HP de 100%.' },

  anti_spell_boots: { tier: 2, categories: [], name: 'Bottes Anti-Sort',        icon: 'img/items/anti_spell_boots.png', combineCost: 800, recipe: ['simple_boots'],
                      isBoots: true,
                      stats: { pm: 2, mr: 10, hpRegenPct: 100 },
                      passive: 'Augmente votre régénération de HP de 100%.' },

  sorcerer_boots:  { tier: 2, categories: [], name: 'Bottes du Sorcier',        icon: 'img/items/sorcerer_boots.png', combineCost: 800, recipe: ['simple_boots'],
                     isBoots: true,
                     stats: { pm: 2, ap: 25, manaRegenPct: 75 },
                     passive: 'Ignore 5% de la résistance magique adverse (peut devenir négative). Augmente votre régénération de mana de 75%.' },

  boots_of_celerity: { tier: 2, categories: [], name: 'Bottes de Célérité',      icon: 'img/items/boots_of_celerity.png', combineCost: 800, recipe: ['simple_boots'],
                       isBoots: true,
                       stats: { pm: 2, maxHP: 250, cdReduction: 1, hpRegenPct: 50, manaRegenPct: 50 },
                       passive: 'Augmente votre régénération de HP de 50% et de mana de 50%.' },

  speed_boots:     { tier: 2, categories: [], name: 'Bottes de Grande Vitesse', icon: 'img/items/speed_boots.png',  combineCost: 800, recipe: ['simple_boots'],
                     isBoots: true,
                     stats: { pm: 2, hpRegenPct: 50, manaRegenPct: 50 },
                     passive: 'Si vous n\'avez pas infligé de dégâts à un héros lors de votre dernier tour, recevez +1 PM ce tour. Augmente votre régénération de HP de 50% et de mana de 50%.' },

  bottes_attaquant: { tier: 2, categories: [], name: 'Bottes de l\'Attaquant',  icon: 'img/items/bottes_attaquant.png', combineCost: 800, recipe: ['simple_boots'],
                      isBoots: true,
                      stats: { pm: 2, ad: 35, extraAutoAttacks: 1 },
                      passive: '+1 auto-attaque par tour.' },

  bottes_assassin:  { tier: 2, categories: ['assassin'], name: 'Bottes Assassines', icon: 'img/items/bottes_assassin.png', combineCost: 800, recipe: ['simple_boots'],
                      isBoots: true,
                      stats: { pm: 2, ad: 35 },
                      passive: 'Ignore 5% de l\'armure adverse (peut devenir négative).' },

  linked_names:    { tier: 1, categories: [], name: 'Nos Noms Sont Liés',    icon: 'img/items/linked_names.png',    combineCost: 300, recipe: [], isStarter: true,
                     stats: { hpRegenPct: 25, manaRegenPct: 25, healEfficiency: 10, goldSharePct: 20 },
                     passive: '+10% d\'efficacité des soins. 20% des golds gagnés sont aussi donnés à votre allié le plus proche. Finir votre tour hors d\'une zone à golds vous rapporte 100g.',
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
                          stats: { ad: 55, critChance: 25 },
                          passive: 'Ignore 35% de l\'armure de la cible lorsque vous lui infligez des dégâts physiques. Inflige de 0 à 30% de dégâts bonus en fonction des HP max de la cible (0% à 1000 HP, 30% à 4000 HP).' },

  arc_des_morts:        { tier: 3, categories: ['dpt'], name: 'Arc des Morts',             icon: 'img/items/arc_des_morts.png',       combineCost: 0,
                          recipe: ['arc_percant', 'small_crit_cape', 'lame_ensanglanté'],
                          stats: { ad: 65, critChance: 25 },
                          passive: 'Vos dégâts physiques appliquent Hémorragie pendant 1 tour aux cibles touchées (soins −50%). Ignore 35% de l\'armure de la cible lorsque vous lui infligez des dégâts physiques.' },

  coeur_de_courage:     { tier: 2, categories: [], name: 'Cœur de Courage',        icon: 'img/items/coeur_de_courage.png',     combineCost: 350, recipe: ['mana_necklace'],
                          stats: { manaRegenPct: 50 } },

  couronne_princiere:   { tier: 3, categories: ['support', 'mage'], name: 'Couronne Princière',    icon: 'img/items/couronne_princiere.png',   combineCost: 300,
                          recipe: ['feu_follet', 'miroir_de_vie'],
                          stats: { ap: 50, cdReduction: 1, manaRegenPct: 125, pm: 1 },
                          passive: 'Vos alliés à 6 cases ou moins gagnent +1 PM au début de leur tour de jeu.' },

  enchanteur_rouge:     { tier: 3, categories: ['support', 'bruiser'], name: 'Enchanteur Rouge', icon: 'img/items/enchanteur_rouge.png',     combineCost: 450,
                          recipe: ['feu_follet', 'coeur_de_courage'],
                          stats: { maxHP: 250, healEfficiency: 15, pm: 1, manaRegenPct: 100 },
                          passive: 'Aura — Vos alliés à moins de 7 cases gagnent +30 AD et +30 AP. (Se recalcule à chaque fin de tour ou achat d\'item.)' },

  protection_divine:    { tier: 3, categories: ['support'], name: 'Protection Divine',      icon: 'img/items/protection_divine.png',    combineCost: 0,
                          recipe: ['coeur_de_courage', 'baton_magique'],
                          stats: { ap: 50, cdReduction: 1, maxHP: 230, healEfficiency: 10 },
                          passive: 'Améliore vos soins de 10%. Lorsqu\'un allié à moins de 10 cases subit un stun, ce stun est annulé (7 tours de CD).' },

  sanctuaire_de_lune:   { tier: 3, categories: ['support', 'mage'], name: 'Sanctuaire de Lune',       icon: 'img/items/sanctuaire_de_lune.png',    combineCost: 200,
                          recipe: ['coeur_de_vie', 'miroir_de_vie'],
                          stats: { ap: 25, cdReduction: 1, maxHP: 200, manaRegenPct: 125 },
                          passive: 'Protection engagée — Lorsque vous soignez ou donnez un bouclier à un allié, l\'allié le plus proche de celui-ci (hors vous-même) reçoit également 40% du montant.' },

  bouclier_protecteur_divin: { tier: 3, categories: ['support', 'bruiser'], name: 'Bouclier Protecteur Divin', icon: 'img/items/bouclier_protecteur_divin.png', combineCost: 300,
                               recipe: ['coeur_de_vie', 'small_antimagic_cape', 'small_armor'],
                               stats: { maxHP: 300, cdReduction: 1, armor: 10, mr: 10 },
                               passive: 'Au début de chaque tour global, vos alliés à 6 cases ou moins gagnent un bouclier égal à 1,5% de vos HP max × le nombre de héros ennemis à 6 cases ou moins de vous. Se réactive à chaque tour global.' },

  coeur_du_monde:       { tier: 3, categories: ['support', 'mage'], name: 'Cœur du Monde',      icon: 'img/items/coeur_du_monde.png',       combineCost: 0,
                          recipe: ['baton_magique', 'coeur_de_courage', 'coeur_de_courage'],
                          stats: { ap: 45, manaRegenPct: 120, healEfficiency: 18 },
                          passive: 'Par tranche de 100% de régénération de mana bonus, gagnez +10 AP et +2% d\'efficacité des soins et boucliers.' },

  coeur_de_vie:         { tier: 2, categories: ['bruiser'], name: 'Cœur de Vie',           icon: 'img/items/coeur_de_vie.png',         combineCost: 250, recipe: ['life_crystal', 'regen_necklace'],
                          stats: { maxHP: 200 } },

  ceinture_de_vie:      { tier: 2, categories: ['bruiser'], name: 'Ceinture de Vie',        icon: 'img/items/ceinture_de_vie.png',      combineCost: 450, recipe: ['life_crystal'],
                          stats: { maxHP: 280 } },

  armure_esprit_magique: { tier: 3, notInUtil: true, categories: ['bruiser'], name: 'Armure de l\'Esprit Magique', icon: 'img/items/armure_esprit_magique.png', combineCost: 550,
                           recipe: ['coeur_de_vie', 'cape_antimagie_moyenne'],
                           stats: { maxHP: 550, mr: 15, healEfficiency: 25 },
                           passive: 'Tous vos soins et régénérations sont améliorés de 25%.' },

  plaque_du_golem:      { tier: 3, categories: ['bruiser'], name: 'Plaque du Golem',         icon: 'img/items/plaque_du_golem.png',      combineCost: 0,
                          recipe: ['moyenne_armure', 'small_armor', 'life_crystal'],
                          stats: { maxHP: 350, armorPct: 20, pm: 1 },
                          passive: 'Vous pouvez esquiver 1 ralentissement par tour.' },

  marteau_divin:        { tier: 3, categories: ['bruiser', 'dpt'], name: 'Marteau Divin',         icon: 'img/items/marteau_divin.png',        combineCost: 0,
                          recipe: ['blue_blade', 'coeur_de_vie', 'grande_pioche'],
                          stats: { ad: 35, cdReduction: 1, maxHP: 425 },
                          passive: 'Votre prochaine attaque renforcée inflige des dégâts bruts équivalents à 10% (7% à distance) des HP max de la cible (min 1,25×AD) et vous soigne de 6% (3% à distance) des HP max (min 0,5×AD).' },

  coeur_de_titane:      { tier: 3, categories: ['bruiser'], name: 'Cœur de Titane',         icon: 'img/items/coeur_de_titane.png',      combineCost: 200,
                          recipe: ['ceinture_de_vie', 'ceinture_de_vie', 'regen_necklace', 'regen_necklace'],
                          stats: { maxHP: 900, hpRegenPct: 100 },
                          passive: 'Infliger une auto-attaque à un ennemi augmente définitivement vos HP max de 3% et lui inflige 2% de vos HP max en dégâts physiques (max 1 fois par tour par adversaire).' },

  armure_de_la_vie:     { tier: 3, categories: ['bruiser'], name: 'Armure de la Vie',       icon: 'img/items/armure_de_la_vie.png',     combineCost: 800,
                          recipe: ['coeur_de_vie', 'ceinture_de_vie'],
                          stats: { maxHP: 1000, hpRegenPct: 200 },
                          passive: 'Si vous n\'avez pas reçu de dégâts lors de votre dernier tour de jeu, vous régénérez 10% de vos HP manquants.' },

  plastron_brulant:     { tier: 2, categories: ['bruiser'], name: 'Plastron Brûlant',      icon: 'img/items/plastron_brulant.png',     combineCost: 500, recipe: ['small_armor'],
                          stats: { armor: 15, maxHP: 70 },
                          passive: 'Subir des dégâts physiques applique Hémorragie sur l\'attaquant pendant 1 tour (soins −50%).' },

  boule_de_piques:      { tier: 2, categories: ['bruiser'], name: 'Boule de Piques',        icon: 'img/items/boule_de_piques.png',      combineCost: 500, recipe: ['life_crystal'],
                          stats: { maxHP: 250 },
                          passive: 'Renvoie 20% des dégâts physiques subis (après calcul d\'armure) à l\'attaquant.' },

  plastron_du_diable_immortel: { tier: 3, notInUtil: true, categories: ['bruiser'], name: 'Plastron du Diable Immortel', icon: 'img/items/plastron_du_diable_immortel.png', combineCost: 0,
                                  recipe: ['moyenne_armure', 'coeur_de_vie', 'life_crystal'],
                                  stats: { maxHP: 500, cdReduction: 1, armorPct: 15 },
                                  passive: '2 tours après avoir subi des dégâts, inflige 7% de vos HP max aux ennemis à ≤5 cases en dégâts magiques et vous soigne de 150% des dégâts totaux infligés (après résistances).' },

  couronne_du_gladiateur: { tier: 3, categories: ['bruiser', 'support'], name: 'Couronne du Gladiateur', icon: 'img/items/couronne_du_gladiateur.png', combineCost: 250,
                            recipe: ['coeur_de_vie', 'moyenne_armure', 'regen_necklace'],
                            stats: { maxHP: 250, hpRegenPct: 100, armorPct: 15 },
                            passive: 'Lorsque l\'allié le plus proche de votre position subit des dégâts, vous redirigez 20% de ces dégâts (pré-résistances) vers vous, puis appliquez vos propres résistances.' },

  armure_de_stalnoth:   { tier: 3, categories: ['bruiser'], name: 'Armure de Stal\'noth',   icon: 'img/items/armure_de_stalnoth.png',   combineCost: 600,
                          recipe: ['boule_de_piques', 'plastron_brulant'],
                          stats: { maxHP: 450, armor: 17 },
                          passive: 'Subir des dégâts physiques applique Hémorragie sur l\'attaquant. Renvoie (20 + max(0, Armure×0,2))% des dégâts physiques subis (avant calcul d\'armure) à l\'attaquant.' },

  pistolet_magique:     { tier: 3, notInUtil: true, categories: ['dpt', 'mage'], name: 'Pistolet Magique',    icon: 'img/items/pistolet_magique.png',  combineCost: 400,
                          recipe: ['sceptre_de_vie', 'alternateur_de_puissance', 'petit_grimoire'],
                          stats: { ad: 40, ap: 80, lifeSteal: 10 },
                          passive: 'Vos sorts ayant à la fois un ratio AD et un ratio AP infligent 20% de dégâts supplémentaires.' },

  lame_antimagie:       { tier: 2, categories: [], name: 'Lame Antimagie',         icon: 'img/items/lame_antimagie.png',       combineCost: 350, recipe: ['short_sword', 'small_antimagic_cape'],
                          stats: { ad: 30, mr: 10 } },

  combattant_antimage:  { tier: 3, notInUtil: true, categories: ['dpt', 'bruiser', 'assassin'], name: 'Combattant Anti-Mage',  icon: 'img/items/combattant_antimage.png',  combineCost: 500,
                          recipe: ['lame_antimagie', 'lame_antimagie'],
                          stats: { ad: 60, cdReduction: 1, mr: 22 },
                          passive: 'Réduit tous les dégâts magiques reçus de 0,1×AD (appliqué après calcul des résistances).' },

  sceptre_de_vie:  { tier: 2, categories: [], name: 'Sceptre de Vie',          icon: 'img/items/sceptre_de_vie.png',   combineCost: 500, recipe: ['short_sword'],
                     stats: { ad: 20, lifeSteal: 10 } },

  lame_du_diable:  { tier: 3, notInUtil: true, categories: ['dpt'], name: 'Lame du Diable',     icon: 'img/items/lame_du_diable.png',  combineCost: 450,
                     recipe: ['petit_arc', 'sceptre_de_vie'],
                     stats: { ad: 40, extraAutoAttacks: 1, lifeSteal: 12 },
                     passive: 'Vos auto-attaques infligent des dégâts magiques bonus égaux à 8% des HP actuels de la cible si vous êtes au corps à corps (PO 1), ou 6% si vous êtes à distance.' },

  grosse_lame:     { tier: 2, categories: [], name: 'Grosse Lame',           icon: 'img/items/grosse_lame.png',     combineCost: 900, recipe: ['short_sword'],
                     stats: { ad: 45 } },

  revolver_d_or:   { tier: 3, categories: ['dpt', 'assassin'], name: 'Révolver d\'Or',       icon: 'img/items/revolver_d_or.png',   combineCost: 400,
                     recipe: ['grande_pioche', 'dague_destructrice', 'small_crit_cape'],
                     stats: { ad: 55, critChance: 25 },
                     passive: 'Ignore 7% de l\'armure adverse (peut devenir négative). Collecte — Vous gagnez des golds équivalents à 35% des dégâts infligés. Exécution — Si une attaque ou un sort laisse un ennemi à 5% de ses HP max ou moins, il meurt.' },

  lame_d_infini:   { tier: 3, categories: ['dpt'], name: "Lame d'Infini",        icon: 'img/items/lame_d_infini.png',   combineCost: 400,
                     recipe: ['grande_pioche', 'grosse_lame', 'small_crit_cape'],
                     stats: { ad: 90, critChance: 25 },
                     passive: 'Vos auto-attaques et sorts physiques critiques infligent 450% de dégâts au lieu de 350%.' },

  lame_electrique: { tier: 3, categories: ['dpt'], name: 'Lame Électrique',       icon: 'img/items/lame_electrique.png', combineCost: 600,
                     recipe: ['epees_croisees', 'petit_arc'],
                     stats: { critChance: 25, extraAutoAttacks: 1 },
                     passive: 'Vos auto-attaques infligent 250 dégâts magiques à tous les ennemis à moins de 6 cases Manhattan de la cible (CD 3 tours).' },

  lame_du_ninja:         { tier: 3, categories: ['dpt', 'assassin'], name: 'Lame du Ninja',              icon: 'img/items/lame_du_ninja.png',        combineCost: 550,
                           recipe: ['dague_destructrice', 'grande_pioche'],
                           stats: { ad: 70 },
                           passive: 'Ignore 7% de l\'armure adverse (peut devenir négative). Si vous n\'avez pas infligé de dégâts à un héros ennemi lors de votre précédent tour, vous gagnez 1 PM pour ce tour.' },

  lame_tueuse_boucliers: { tier: 3, categories: ['dpt'], name: 'Lame Tueuse de Boucliers', icon: 'img/items/lame_tueuse_boucliers.png', combineCost: 600,
                           recipe: ['dague_destructrice', 'grande_pioche'],
                           stats: { ad: 60 },
                           passive: 'Ignore 7% de l\'armure adverse (peut devenir négative). Lorsque vous attaquez une cible qui a un bouclier, les dégâts infligés sont doublés contre le bouclier (normaux contre les HP).' },

  canon_de_feu:    { tier: 3, categories: ['dpt'], name: 'Canon de Feu',          icon: 'img/items/canon_de_feu.png',    combineCost: 500,
                     recipe: ['epees_croisees', 'petit_arc'],
                     stats: { critChance: 25, extraAutoAttacks: 1 },
                     passive: 'Votre attaque de base gagne 1 PO.' },

  epee_double_feu: { tier: 3, categories: ['dpt'], name: 'Épée Double de Feu',   icon: 'img/items/epee_double_feu.png', combineCost: 550,
                     recipe: ['life_crystal', 'grande_pioche', 'petit_grimoire'],
                     stats: { ad: 35, ap: 20, maxHP: 250 },
                     passive: 'Les auto-attaques appliquent 2 fois les effets à l\'impact (Lame du Diable, Poignard de Dieu, etc.).' },

  // ─── TIER 2 — Générique (suite) ─────────────────────────────

  lame_ensanglanté: { tier: 2, categories: [], name: 'Lame Ensanglantée',       icon: 'img/items/lame_ensanglantee.png', combineCost: 450,
                      recipe: ['short_sword'],
                      stats: { ad: 18 },
                      passive: 'Vos dégâts physiques appliquent Hémorragie pendant 1 tour aux cibles touchées (soins −50%).' },

  epee_ensanglantee: { tier: 3, notInUtil: true, categories: ['dpt', 'bruiser', 'assassin'], name: 'Épée Ensanglantée', icon: 'img/items/epee_ensanglantee.png', combineCost: 200,
                       recipe: ['grande_pioche', 'grosse_lame', 'sceptre_de_vie'],
                       stats: { ad: 80, lifeSteal: 20 },
                       passive: '25% des dégâts physiques infligés (après résistances) vous sont donnés sous forme de bouclier pendant 3 tours (stackable).' },

  epee_cinglante:  { tier: 2, categories: [], name: 'Épée Cinglante',         icon: 'img/items/epee_cinglante.png',  combineCost: 400,
                     recipe: ['short_sword', 'short_sword'],
                     stats: { ad: 25 },
                     passive: 'Chaque sort ou attaque de base réduit l\'armure de la cible de 3% de son armure totale (max 20%) pendant 5 tours.' },

  couperet_du_demon: { tier: 3, notInUtil: true, categories: ['dpt', 'bruiser'], name: 'Couperet du Démon', icon: 'img/items/couperet_du_demon.png', combineCost: 400,
                       recipe: ['epee_cinglante', 'white_walker_hammer'],
                       stats: { ad: 55, cdReduction: 1, maxHP: 350 },
                       passive: 'Fuite — Chaque attaque de base infligée à un ennemi vous octroie 1 PM supplémentaire ce tour. Brise Armure — Chaque sort ou attaque de base réduit l\'armure de la cible de 6% de son armure totale (max 30%) pendant 5 tours.' },

  fleau_du_chevalier_bleu: { tier: 3, notInUtil: true, categories: ['dpt', 'bruiser'], name: 'Fléau du Chevalier Bleu', icon: 'img/items/fleau_du_chevalier_bleu.png', combineCost: 500,
                              recipe: ['petit_arc', 'white_walker_hammer'],
                              stats: { ad: 40, extraAutoAttacks: 1, maxHP: 450 },
                              passive: 'Bénédiction du Chevalier Bleu — CD de votre Sort 3 −2. Lors du lancer de votre ultime, gagnez +1 PM et +2 attaques ce tour.' },

  tueur_de_dieux:  { tier: 3, categories: ['dpt', 'bruiser'], name: 'Tueur de Dieux',    icon: 'img/items/tueur_de_dieux.png',  combineCost: 400,
                     recipe: ['marteau_sinad', 'grande_pioche'],
                     stats: { ad: 70, extraAutoAttacks: 1 },
                     passive: '30% des dégâts de vos attaques de base sont des dégâts bruts (ignorent armure et RM).' },

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
                     stats: { manaRegenPct: 25 } },



  small_crit_cape:      { tier: 1, categories: [], name: 'Petite Cape Critique',   icon: 'img/items/small_crit_cape.png',   combineCost: 400, recipe: [],
                          stats: { critChance: 8 },
                          passive: 'Les attaques de base ont une chance de coup critique.' },

  danse_des_morts:      { tier: 3, categories: ['dpt'], name: 'Danse des Morts',    icon: 'img/items/danse_des_morts.png',   combineCost: 500,
                          recipe: ['epees_croisees', 'petit_arc'],
                          stats: { critChance: 25, extraAutoAttacks: 1, pm: 1 },
                          passive: 'Vous pouvez traverser les murs et les adversaires (impossible de finir sur une case occupée).' },

  lames_navitiennes:    { tier: 3, categories: ['dpt'], name: 'Lames Navitiennes',  icon: 'img/items/lames_navitiennes.png', combineCost: 250,
                          recipe: ['petit_arc', 'epees_croisees'],
                          stats: { critChance: 25, extraAutoAttacks: 1 },
                          passive: 'Votre première auto-attaque de chaque tour réduit le CD de tous vos sorts de 1.' },

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

  le_voyageur:          { tier: 2, categories: ['bruiser', 'support'], name: 'Le Voyageur', icon: 'img/items/le_voyageur.png', combineCost: 300, recipe: ['life_crystal', 'moyenne_armure'],
                          stats: { maxHP: 250, armor: 14, pm: 1, goldPerTurn: 50 },
                          passive: 'Vous gagnez 50 golds supplémentaires par tour. Lorsque vous êtes hors d\'une zone à golds, vos alliés présents à 6 cases ou moins gagnent 50 golds supplémentaires par tour.' },

  flamme_intense:       { tier: 2, categories: ['bruiser'], name: 'Flamme Intense',  icon: 'img/items/flamme_intense.png',    combineCost: 350, recipe: ['life_crystal'],
                          stats: { maxHP: 200 },
                          passive: 'Les ennemis présents sur une case adjacente à la fin de votre tour subissent 1% de vos HP max en dégâts magiques.' },

  flamme_du_soleil_flamboyant: { tier: 3, categories: ['bruiser'], name: 'Flamme du Soleil Flamboyant', icon: 'img/items/flamme_du_soleil_flamboyant.png', combineCost: 350,
                                 recipe: ['flamme_intense', 'moyenne_armure', 'life_crystal'],
                                 stats: { maxHP: 450, armor: 12 },
                                 passive: 'Les ennemis présents sur une case adjacente à la fin de votre tour subissent 5% de vos HP max en dégâts magiques.' },

  petit_grimoire:  { tier: 1, categories: [], name: 'Petit Grimoire',          icon: 'img/items/petit_grimoire.png',   combineCost: 400, recipe: [],
                     stats: { ap: 15 } },

  barriere_de_jade:    { tier: 2, categories: ['mage', 'support'], name: 'Barrière de Jade', icon: 'img/items/barriere_de_jade.png', combineCost: 0,
                         recipe: ['petit_grimoire', 'petit_grimoire', 'small_antimagic_cape'],
                         stats: { ap: 45, mr: 10 } },

  voile_antimagie:     { tier: 3, categories: ['mage', 'support'], name: 'Voile Antimagie',   icon: 'img/items/voile_antimagie.png',   combineCost: 200,
                         recipe: ['barriere_de_jade', 'gros_baton_magique'],
                         stats: { ap: 100, mr: 12 },
                         passive: 'Le Voile — 1 fois tous les 3 tours, vous bloquez les dégâts d\'un sort à dégâts magiques que vous subissez.' },

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

  furie_magique:      { tier: 3, categories: ['mage'], name: 'Furie Magique',           icon: 'img/items/furie_magique.png',      combineCost: 200,
                        recipe: ['alternateur_de_puissance', 'gros_baton_magique'],
                        stats: { ap: 130 },
                        passive: 'Ignore 7% de la résistance magique adverse (peut devenir négative). Flammes de Furie — Vos dégâts magiques contre des cibles ayant moins de 40% de leurs HP max infligent 20% de dégâts en plus.' },

  gros_baton_magique: { tier: 2, categories: ['mage'], name: 'Gros Bâton Magique',    icon: 'img/items/gros_baton_magique.png', combineCost: 300,
                        recipe: ['baton_magique', 'petit_grimoire'],
                        stats: { ap: 80 } },

  chapeau_de_dieu:    { tier: 3, categories: ['mage'], name: 'Chapeau de Dieu',       icon: 'img/items/chapeau_de_dieu.png',    combineCost: 0,
                        recipe: ['gros_baton_magique', 'baton_magique'],
                        stats: { ap: 120 },
                        passive: 'Votre AP totale est multipliée par 1,4 (calculé après ajout des stats de cet item).' },

  cristal_de_vide: { tier: 2, categories: ['mage'], name: 'Cristal de Vide',          icon: 'img/items/cristal_de_vide.png',  combineCost: 700,
                     recipe: ['petit_grimoire'],
                     stats: { ap: 25 },
                     passive: 'Vos dégâts magiques ignorent 15% de la résistance magique adverse (peut devenir négative).' },

  baton_des_abysses: { tier: 3, categories: ['mage'], name: 'Bâton des Abysses',      icon: 'img/items/baton_des_abysses.png', combineCost: 350,
                       recipe: ['cristal_de_vide', 'baton_magique'],
                       stats: { ap: 90 },
                       passive: 'Vos dégâts magiques ignorent 35% de l\'armure adverse (ne peut pas devenir négative via cet item).' },

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

  focus_lointain:     { tier: 3, notInUtil: true, categories: ['mage'], name: 'Focus Lointain',             icon: 'img/items/focus_lointain.png',     combineCost: 450,
                        recipe: ['livre_incantations', 'livre_incantations', 'petit_grimoire'],
                        stats: { ap: 75, cdReduction: 2 },
                        passive: 'Toucher un ennemi à plus de 5 cases avec un sort magique pose une marque. Le prochain sort magique sur cette cible ce tour inflige 15% de dégâts supplémentaires.' },

  catalyseur_noir:    { tier: 2, categories: ['mage', 'bruiser'], name: 'Catalyseur Noir', icon: 'img/items/catalyseur_noir.png',    combineCost: 150,
                        recipe: ['life_crystal', 'life_crystal', 'mana_crystal'],
                        stats: { maxHP: 300, maxMana: 350 },
                        passive: '20% des dégâts reçus (pré-résistances) sont convertis en mana.' },

  miroir_de_vie:      { tier: 2, categories: ['mage'], name: 'Miroir de Vie',             icon: 'img/items/miroir_de_vie.png',      combineCost: 250,
                        recipe: ['mana_necklace', 'petit_grimoire'],
                        stats: { ap: 25, manaRegenPct: 50 } },

  echo_du_coeur:      { tier: 3, categories: ['mage', 'support'], name: 'Écho du Cœur',         icon: 'img/items/echo_du_coeur.png',      combineCost: 250,
                        recipe: ['coeur_de_vie', 'miroir_de_vie'],
                        stats: { ap: 35, cdReduction: 1, maxHP: 200, manaRegenPct: 125 },
                        passive: 'Gagnez 35% des dégâts infligés aux champions ennemis (avant résistances) en charges. Consommez ces charges lors de vos soins ou boucliers pour les amplifier.' },

  blason_glorieux:    { tier: 3, categories: ['mage'], name: 'Blason Glorieux',           icon: 'img/items/blason_glorieux.png',    combineCost: 300,
                        recipe: ['miroir_de_vie', 'livre_incantations'],
                        stats: { ap: 60, manaRegenPct: 120, cdReduction: 1 },
                        passive: 'Chaque débuff infligé par un sort compte pour 4% des HP max de la cible en dégâts magiques (ex : slow + hémorragie = 8%). S\'applique à toutes les cibles touchées.' },

  poignard_de_dieu:   { tier: 3, notInUtil: true, categories: ['mage', 'bruiser'], name: 'Poignard de Dieu',    icon: 'img/items/poignard_de_dieu.png',   combineCost: 350,
                        recipe: ['livre_incantations', 'baton_magique', 'petit_arc'],
                        stats: { maxHP: 180, ap: 80, cdReduction: 1, extraAutoAttacks: 1 },
                        passive: 'Vos attaques de base infligent 0,35×AP dégâts magiques supplémentaires (n\'active pas les passifs d\'items liés aux attaques de base).' },

  masque_hante:       { tier: 2, categories: ['mage', 'bruiser'], name: 'Masque Hanté',        icon: 'img/items/masque_hante.png',       combineCost: 300,
                        recipe: ['petit_grimoire', 'life_crystal'],
                        stats: { ap: 30, maxHP: 200 } },

  oeil_demoniaque:    { tier: 3, notInUtil: true, categories: ['mage', 'bruiser'], name: 'Oeil Démoniaque',      icon: 'img/items/oeil_demoniaque.png',    combineCost: 350,
                        recipe: ['masque_hante', 'livre_incantations'],
                        stats: { ap: 70, cdReduction: 1, maxHP: 200, lifeSteal: 10 },
                        passive: 'Chaque source de dégâts magiques inflige des dégâts bruts supplémentaires équivalents à 7% des dégâts magiques infligés.' },

  masque_de_larme:    { tier: 3, categories: ['mage', 'bruiser'], name: 'Masque de Larme',     icon: 'img/items/masque_de_larme.png',    combineCost: 0,
                        recipe: ['masque_hante', 'baton_magique'],
                        stats: { ap: 75, maxHP: 300 },
                        passive: 'Toucher un ennemi avec un sort lui inflige 2% de ses HP max en dégâts bruts par tour pendant 3 tours.' },

  baton_anciennete:   { tier: 3, categories: ['mage', 'bruiser'], name: "Bâton d'Ancienneté", icon: 'img/items/baton_anciennete.png',  combineCost: 200,
                        recipe: ['catalyseur_noir', 'baton_magique'],
                        stats: { ap: 45, maxHP: 350, maxMana: 500 },
                        passive: 'Développement ancien — Gagnez +3 AP, +10 HP max et +30 Mana max par tour (max 10 fois). 30% des dégâts reçus (pré-résistances) sont convertis en mana.' },

  sceptre_de_glace:   { tier: 3, categories: ['mage'], name: 'Sceptre de Glace',         icon: 'img/items/sceptre_de_glace.png',   combineCost: 250,
                        recipe: ['baton_magique', 'ceinture_de_vie', 'petit_grimoire'],
                        stats: { ap: 65, maxHP: 400 },
                        passive: 'Vos dégâts magiques (hors objets) ralentissent les cibles de 1 PM pendant 1 tour (max 2 stacks par cible via cet item).' },

  sceptre_du_malin:   { tier: 3, notInUtil: true, categories: ['mage'], name: 'Sceptre du Malin',           icon: 'img/items/sceptre_du_malin.png',   combineCost: 600,
                        recipe: ['grimoire_magique', 'baton_magique'],
                        stats: { ap: 90, cdReduction: 1, maxMana: 400 },
                        passive: 'Réduit de 2 le CD de votre ultime lors de son utilisation (minimum 1). Si votre ultime inflige des dégâts magiques, les ennemis touchés reçoivent 20 + 0,15×AP dégâts magiques supplémentaires.' },

  torche_sombre:      { tier: 3, notInUtil: true, categories: ['mage'], name: 'Torche Sombre',              icon: 'img/items/torche_sombre.png',      combineCost: 400,
                        recipe: ['grimoire_magique', 'grimoire_magique'],
                        stats: { ap: 80, cdReduction: 1, maxMana: 350 },
                        passive: 'Toucher un ennemi avec un sort lui inflige 20 + 0,1×AP dégâts magiques par tour pendant 3 tours.' },

  casque_necrometien: { tier: 3, notInUtil: true, categories: [], name: 'Casque du Nécromentien',        icon: 'img/items/casque_necrometien.png', combineCost: 600,
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
                         passive: 'Vos attaques de base renforcées par un sort infligent 0,5×AD dégâts physiques supplémentaires.' },

  bouclier_gele:       { tier: 2, categories: [], name: 'Bouclier Gelé',               icon: 'img/items/bouclier_gele.png',       combineCost: 300,
                         recipe: ['small_armor', 'mana_crystal'],
                         stats: { maxMana: 130, manaRegen: 10, armor: 13 } },

  gantelet_refroidissant: { tier: 3, notInUtil: true, categories: ['bruiser'], name: 'Gantelet Refroidissant', icon: 'img/items/gantelet_refroidissant.png', combineCost: 0,
                            recipe: ['bouclier_gele', 'blue_blade'],
                            stats: { maxMana: 250, manaRegen: 15, cdReduction: 1, armor: 15 },
                            passive: 'Gelure — Vos attaques de base renforcées ralentissent la cible (−1 PM au prochain tour). La zone autour de la cible augmente avec votre armure totale (≥20% : 1-3-1 ; ≥30% : 1-3-5-3-1, cappé à 40%). De plus, inflige 3×Armure% dégâts magiques supplémentaires (ex : 35% armure → 105 dégâts).' },

  couronne_de_la_reine: { tier: 3, categories: ['support', 'mage'], name: 'Couronne de la Reine', icon: 'img/items/couronne_de_la_reine.png', combineCost: 200,
                          recipe: ['coeur_de_courage', 'mana_tear', 'life_crystal'],
                          stats: { maxHP: 250, maxMana: 300, manaRegenPct: 125, healEfficiency: 15, manaOnSpell: 55, manaOnSpellMax: 700 },
                          passive: 'Chaque sort lancé augmente votre Mana max de 55 (max +700 au total). Lorsque le cap est atteint, la Couronne se transforme en Diadème de la Reine. Vous gagnez 80 golds supplémentaires par tour hors zone à golds.' },

  diademe_de_la_reine: { tier: 4, categories: ['support', 'mage'], name: 'Diadème de la Reine', icon: 'img/items/diademe_de_la_reine.png', combineCost: 0,
                         recipe: [], notBuyable: true,
                         stats: { maxHP: 250, maxMana: 300, manaRegenPct: 125, healEfficiency: 15, manaOnSpell: 40, manaOnSpellMax: 700 },
                         passive: 'Vous gagnez 80 golds supplémentaires par tour hors zone à golds. Vos soins sont augmentés de 6% de votre Mana max.' },

  sceptre_de_mana: { tier: 3, notInUtil: true, categories: ['mage'], name: 'Sceptre de Mana',         icon: 'img/items/sceptre_de_mana.png',     combineCost: 450,
                     recipe: ['grimoire_magique', 'mana_tear', 'petit_grimoire'],
                     stats: { ap: 60, cdReduction: 1, maxMana: 300, manaRegenPct: 125, manaOnSpell: 55, manaOnSpellMax: 700 },
                     passive: 'Chaque sort lancé augmente votre Mana max de 55 (max +700 au total). Lorsque le cap est atteint, le Sceptre se transforme en Sceptre de l\'Ange.' },

  sceptre_ange:    { tier: 4, categories: ['mage'], name: 'Sceptre de l\'Ange',      icon: 'img/items/sceptre_ange.png',        combineCost: 0,
                     recipe: [], notBuyable: true,
                     stats: { ap: 60, cdReduction: 1, maxMana: 300, manaRegenPct: 125, manaOnSpell: 40, manaOnSpellMax: 700 },
                     passive: 'Solde de mana — Vos sorts coûtent 15% de mana en moins. Dernier Recours — Lorsque vos HP tombent sous 30%, vous gagnez un bouclier égal à 100% de votre mana actuel pendant 3 tours (CD 8 tours).' },

  epee_de_mana:    { tier: 3, notInUtil: true, categories: ['dpt'], name: 'Épée de Mana',             icon: 'img/items/epee_de_mana.png',        combineCost: 500,
                     recipe: ['mana_tear', 'marteau_sinad'],
                     stats: { ad: 35, cdReduction: 1, maxMana: 200, manaRegenPct: 125, manaOnSpell: 40, manaOnAutoAttack: 40, manaOnSpellMax: 700 },
                     passive: 'Chaque sort lancé ou attaque de base augmente votre Mana max de 40 (max +700 au total). Lorsque le cap est atteint, l\'Épée se transforme en Épée de l\'Ange.' },

  epee_ange:       { tier: 4, categories: ['dpt'], name: 'Épée de l\'Ange',          icon: 'img/items/epee_ange.png',           combineCost: 0,
                     recipe: [], notBuyable: true,
                     stats: { ad: 35, cdReduction: 1, maxMana: 200, manaOnSpell: 15, manaOnSpellMax: 700 },
                     passive: 'Solde de mana — Vos sorts coûtent 15% de mana en moins. Mana Renforçant — Vos attaques de base infligent des dégâts supplémentaires égaux à 5% de votre mana max.' },

  // ─── TIER 3 — Assassin ──────────────────────────────────────

  lame_de_nargoth:     { tier: 3, notInUtil: true, categories: ['assassin'], name: 'Lame de Nargoth',          icon: 'img/items/lame_de_nargoth.png',     combineCost: 300,
                         recipe: ['black_blade', 'white_walker_hammer'],
                         stats: { ad: 80, cdReduction: 1, maxHP: 250 },
                         passive: 'Ignore 7% d\'armure adverse. Vigilance Sombre : si la cible a moins de 15% d\'armure, vos dégâts sont augmentés de 10%. Chaque attaque de base infligée à un ennemi vous octroie 1 PM ce tour.' },

  // ─── TIER 3 — Mage ──────────────────────────────────────────

  livre_des_morts_vivants: { tier: 3, notInUtil: true, categories: ['mage'], name: 'Livre des Morts-Vivants', icon: 'img/items/livre_des_morts_vivants.png', combineCost: 550,
                             recipe: ['boule_du_demon', 'baton_magique'],
                             stats: { ap: 80, cdReduction: 1, maxHP: 150 },
                             passive: 'Vos dégâts magiques appliquent Hémorragie à la cible pendant 1 tour (soins −50%).' },

  magic_sword:         { tier: 3, notInUtil: true, categories: ['mage'], name: 'Épée Magique',              icon: 'img/items/magic_sword.png',         combineCost: 500,
                         recipe: ['baton_magique', 'blue_blade'],
                         stats: { ap: 55, cdReduction: 1 },
                         passive: 'Vos attaques de base renforcées par un sort infligent 0,75×AP dégâts magiques supplémentaires.' },

  // ─── TIER 3 — Bruiser / Tank ────────────────────────────────

  holy_trinity:        { tier: 3, notInUtil: true, categories: ['bruiser'], name: 'Trinité Sacrée',            icon: 'img/items/holy_trinity.png',        combineCost: 350,
                         recipe: ['white_walker_hammer', 'blue_blade'],
                         stats: { maxHP: 350, ad: 40, cdReduction: 1, maxMana: 100 },
                         passive: 'Chaque attaque de base infligée à un ennemi vous octroie 1 PM ce tour (1 fois par tour). Vos attaques renforcées par un sort infligent 1×AD dégâts physiques supplémentaires.' },

  echo_du_malin:       { tier: 3, notInUtil: true, categories: ['mage'], name: 'Écho du Malin',              icon: 'img/items/echo_du_malin.png',       combineCost: 300,
                         recipe: ['alternateur_de_puissance', 'grimoire_magique'],
                         stats: { ap: 100, cdReduction: 1, maxMana: 600 },
                         passive: 'Vos sorts à dégâts magiques infligent 0,15×AP dégâts magiques supplémentaires à la cible et aux ennemis à 5 cases ou moins (CD : 3 tours).' },

  faux_bleue_du_mal:   { tier: 3, notInUtil: true, categories: ['dpt', 'bruiser'], name: 'Faux Bleue du Mal',  icon: 'img/items/faux_bleue_du_mal.png',   combineCost: 300,
                         recipe: ['blue_blade', 'grande_pioche', 'small_crit_cape'],
                         stats: { ad: 50, cdReduction: 1, critChance: 25 },
                         passive: 'Vos attaques de base renforcées par un sort infligent 0,75×AD dégâts physiques supplémentaires. Récupère également 10% du mana manquant.' },
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
