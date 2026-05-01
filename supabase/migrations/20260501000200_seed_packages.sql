-- ============================================================
-- Seed: default packages, mirroring the existing hard-coded set.
-- All prices subject to CEO sign-off; admin/director can edit via dashboard.
-- ============================================================

insert into public.packages
  (name, type, duration_label, duration_hours, base_price, best_for, bullets, icon_name, base_bedrooms, base_bathrooms, display_order)
values
  ('Two-Hour Express', 'half-day', '2 hours', 2.0, 350,
   'Apartments & studios',
   '["Kitchen surfaces & sink","One bathroom refresh","Living areas tidy & dust","Floors swept / vacuumed"]'::jsonb,
   'Sparkles', 1, 1, 1),

  ('Half-Day Clean', 'half-day', '4 hours', 4.0, 625,
   'Standard family homes',
   '["Full kitchen clean","All bathrooms","Bedrooms made up","Floors mopped throughout"]'::jsonb,
   'Home', 3, 2, 2),

  ('Full-Day Deep Clean', 'full-day', '6–8 hours', 7.0, 1050,
   'Move-in/out, deep cleans',
   '["Inside cupboards & appliances","Skirtings, doors & frames","Window interiors","Top-to-bottom detail clean"]'::jsonb,
   'Sofa', 4, 3, 3),

  ('Laundry Add-On', 'addon', 'Per load', null, 100,
   'Wash, fold, iron — add to any clean',
   '["Wash & tumble or line dry","Neatly folded","Ironing on request","Combine with any package"]'::jsonb,
   'Shirt', 1, 1, 4);
