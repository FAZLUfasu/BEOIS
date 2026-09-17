import { apiRequest } from "@/lib/api/client";

import type {
  PartnerListItem,
} from "@/types/partners";

export function getActivePartners() {
  return apiRequest<PartnerListItem[]>(
    "/partners/active/",
  );
}