import { query } from './db';
import type { Testimonial, TestimonialRepository } from './trust-referral-eligibility';

type TestimonialRow = {
  id: string;
  site_id: string;
  business_id: string;
  subdomain: string;
  testimonial_type: Testimonial['type'];
  testimonial_text: string;
  displayed_source: string;
  permission_attested_at: Date;
  published_at: Date | null;
  hidden_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

const SELECT_TESTIMONIAL = `t.id,t.site_id,t.business_id,s.subdomain,t.testimonial_type,t.testimonial_text,t.displayed_source,t.permission_attested_at,t.published_at,t.hidden_at,t.created_at,t.updated_at,t.deleted_at`;

function mapTestimonial(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    siteId: row.site_id,
    businessId: row.business_id,
    siteSubdomain: row.subdomain,
    type: row.testimonial_type,
    text: row.testimonial_text,
    source: row.displayed_source,
    permissionAttestedAt: row.permission_attested_at,
    publishedAt: row.published_at,
    hiddenAt: row.hidden_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

export const postgresTestimonialRepository: TestimonialRepository = {
  async findOwnedSite(ownerUserId, subdomain) {
    const result = await query<{ id: string; business_id: string; owner_user_id: string; subdomain: string }>(`select s.id,s.business_id,b.owner_user_id,s.subdomain from site s join business b on b.id=s.business_id where b.owner_user_id=$1 and s.subdomain=$2 and s.deleted_at is null`, [ownerUserId, subdomain]);
    const row = result.rows[0];
    return row ? { id: row.id, businessId: row.business_id, ownerUserId: row.owner_user_id, subdomain: row.subdomain } : null;
  },
  async create(input) {
    const result = await query<TestimonialRow>(`insert into testimonial(site_id,business_id,testimonial_type,testimonial_text,displayed_source,permission_attested_at,published_at,hidden_at,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id,site_id,business_id,$11::text subdomain,testimonial_type,testimonial_text,displayed_source,permission_attested_at,published_at,hidden_at,created_at,updated_at,deleted_at`, [input.siteId, input.businessId, input.type, input.text, input.source, input.permissionAttestedAt, input.publishedAt, input.hiddenAt, input.createdAt, input.updatedAt, input.siteSubdomain]);
    return mapTestimonial(result.rows[0]);
  },
  async updateOwned(ownerUserId, testimonialId, update) {
    const result = await query<TestimonialRow>(`update testimonial t set testimonial_text=$3,displayed_source=$4,permission_attested_at=$5,updated_at=$6 from site s join business b on b.id=s.business_id where t.id=$2 and t.site_id=s.id and t.business_id=s.business_id and b.owner_user_id=$1 and t.deleted_at is null returning ${SELECT_TESTIMONIAL}`, [ownerUserId, testimonialId, update.text, update.source, update.permissionAttestedAt, update.updatedAt]);
    return result.rows[0] ? mapTestimonial(result.rows[0]) : null;
  },
  async setPublishedOwned(ownerUserId, testimonialId, update) {
    const result = await query<TestimonialRow>(`update testimonial t set published_at=$3,hidden_at=$4,updated_at=$5 from site s join business b on b.id=s.business_id where t.id=$2 and t.site_id=s.id and t.business_id=s.business_id and b.owner_user_id=$1 and t.deleted_at is null returning ${SELECT_TESTIMONIAL}`, [ownerUserId, testimonialId, update.publishedAt, update.hiddenAt, update.updatedAt]);
    return result.rows[0] ? mapTestimonial(result.rows[0]) : null;
  },
  async softDeleteOwned(ownerUserId, testimonialId, deletedAt) {
    const result = await query(`update testimonial t set deleted_at=$3,published_at=null,updated_at=$3 from site s join business b on b.id=s.business_id where t.id=$2 and t.site_id=s.id and t.business_id=s.business_id and b.owner_user_id=$1 and t.deleted_at is null`, [ownerUserId, testimonialId, deletedAt]);
    return result.rowCount === 1;
  },
  async listOwned(ownerUserId) {
    const result = await query<TestimonialRow>(`select ${SELECT_TESTIMONIAL} from testimonial t join site s on s.id=t.site_id and s.business_id=t.business_id join business b on b.id=t.business_id where b.owner_user_id=$1 and t.deleted_at is null order by t.created_at desc,t.id`, [ownerUserId]);
    return result.rows.map(mapTestimonial);
  },
  async listPublic(subdomain) {
    const result = await query<TestimonialRow>(`select ${SELECT_TESTIMONIAL} from testimonial t join site s on s.id=t.site_id and s.business_id=t.business_id where s.subdomain=$1 and s.deleted_at is null and t.deleted_at is null and t.published_at is not null order by t.published_at desc,t.id`, [subdomain]);
    return result.rows.map(mapTestimonial);
  }
};
