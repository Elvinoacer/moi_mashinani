export const HOUSING_CATEGORY = "hostels-rooms";

export const HOUSING_SAFETY_NOTICE =
  "Housing posts and replies are community submissions. Moi Mashinani does not verify these people, properties or vacancies, handle rent payments, or guarantee a transaction. Scams can happen. Visit the property, confirm the landlord or agent's authority, and check the terms before paying. Never send a deposit or viewing fee just because someone contacts you here.";

export type HousingIntent = "LOOKING" | "VACANCY";

export function isHousingIntent(value: unknown): value is HousingIntent {
  return value === "LOOKING" || value === "VACANCY";
}
