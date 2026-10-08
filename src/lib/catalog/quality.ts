/**
 * Data-quality heuristics shared by the restaurant fetch scripts.
 * Open datasets (OSM tags, Facebook-derived Overture places) contain some
 * businesses that are tagged as food but clearly aren't, and building names
 * that are really shop names. These rules filter the obvious cases.
 */

/** Words in a place name that mean it isn't somewhere you eat. */
const NON_FOOD_NAME =
  /\b(coaching|academy|school|tutor(ial|ing)?|institute|university|college|enterprise|traders?|trading|pharmacy|pharma|medicine|clinic|hospital|diagnostic|salon|parlou?r|tailors?|electronics?|mobile|telecom|printing|press|consultan(t|cy)|agency|realty|properties|developers?|furniture|hardware|garments?|boutique|fashion|gym|fitness|laundry|courier|travels?|tours?|office|bank|atm)\b/i;

export function looksLikeNonFood(name: string): boolean {
  return NON_FOOD_NAME.test(name);
}

/** Words that make a name read as a building or complex. */
const BUILDING_WORDS =
  /\b(tower|towers|complex|plaza|square|mall|centre|center|market|bhaban|bhabon|building|arcade|court|point|heights|palace|park|city|shopping|house|mansion|villa|garden|gardens|trade|corporate|commercial|food court|kitchen|hub)\b/i;

export function looksLikeBuildingName(name: string): boolean {
  return BUILDING_WORDS.test(name);
}
