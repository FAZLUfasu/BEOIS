export interface PartnerUserMini {
  id: string;
  username: string;
  email: string;
}

export interface PartnerListItem {
  id: string;
  partner_id: string;
  name: string;

  partner_type: string;
  partner_type_display: string;

  status: string;
  status_display: string;

  contact_person: string;
  phone_number: string;
  email: string;

  city: string;
  district: string;
  state: string;
  territory: string;

  organization_name: string;

  relationship_manager: PartnerUserMini | null;

  created_at: string;
  updated_at: string;
}