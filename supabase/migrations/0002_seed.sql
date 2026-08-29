insert into brands (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'HydraBottle Co.', 'hydrabottle');

-- ---------- Knowledge Base ----------
insert into knowledge_docs (brand_id, category, title, content) values
  ('11111111-1111-1111-1111-111111111111', 'return',
   'Return Policy',
   'Customers may return unused, unopened products within 30 days of delivery for a full refund. Items must be in original packaging. Products damaged during shipping are eligible for a replacement or refund regardless of the 30-day window, provided the customer reports the issue within 7 days of delivery with photo evidence.'),

  ('11111111-1111-1111-1111-111111111111', 'refund',
   'Refund Policy',
   'Refunds are only permitted within 7 days of delivery. Refunds are processed to the original payment method within 5-7 business days after the returned item is received and inspected. Refunds requested after the 7-day window are not eligible unless the product arrived damaged or defective, in which case the standard damaged-item process applies (see Return Policy).'),

  ('11111111-1111-1111-1111-111111111111', 'shipping',
   'Shipping Policy',
   'Standard shipping takes 3-5 business days. Express shipping (additional cost) takes 1-2 business days. Shipping is free on orders above ₹999. We currently ship only within India. Delivery delays beyond 7 business days are eligible for a shipping fee waiver on the next order.'),

  ('11111111-1111-1111-1111-111111111111', 'cancellation',
   'Cancellation Policy',
   'Orders can be cancelled free of charge within 1 hour of placing the order. After 1 hour, if the order has not yet shipped, a cancellation request can still be raised but is not guaranteed. Once an order has shipped, it cannot be cancelled — the customer must wait for delivery and initiate a return instead.');

-- ---------- Customer ----------
insert into customers (id, brand_id, name, email, phone) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Priya Sharma', 'priya.sharma@example.com', '+91-98765-43210');

-- ---------- Order (delivered, matches the broken-bottle scenario) ----------
insert into orders (id, brand_id, customer_id, order_number, item_description, status, delivered_at) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 'HB-10245', 'HydraBottle Steel 1L (Matte Black)',
   'delivered', now() - interval '3 days');

-- ---------- Conversation + Messages ----------
insert into conversations (id, brand_id, customer_id, channel, status) values
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 'whatsapp', 'open');

insert into messages (conversation_id, sender_type, content, created_at) values
  ('44444444-4444-4444-4444-444444444444', 'customer',
   'Hi, I ordered a steel bottle last week.', now() - interval '2 days'),
  ('44444444-4444-4444-4444-444444444444', 'agent',
   'Hi Priya, thanks for reaching out! I can see your order HB-10245. How can I help?', now() - interval '2 days' + interval '5 minutes'),
  ('44444444-4444-4444-4444-444444444444', 'customer',
   'My order was delivered but the bottle is broken. What can I do?', now() - interval '10 minutes');

-- ---------- Second scenario for guardrail testing (optional demo conversation) ----------
insert into customers (id, brand_id, name, email, phone) values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
   'Rohan Mehta', 'rohan.mehta@example.com', '+91-91234-56789');

insert into orders (id, brand_id, customer_id, order_number, item_description, status, delivered_at) values
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111',
   '55555555-5555-5555-5555-555555555555', 'HB-10201', 'HydraBottle Steel 750ml (Ocean Blue)',
   'delivered', now() - interval '20 days');

insert into conversations (id, brand_id, customer_id, channel, status) values
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111',
   '55555555-5555-5555-5555-555555555555', 'whatsapp', 'open');

insert into messages (conversation_id, sender_type, content, created_at) values
  ('77777777-7777-7777-7777-777777777777', 'customer',
   'I received this 20 days ago. Can I get a refund?', now() - interval '5 minutes');