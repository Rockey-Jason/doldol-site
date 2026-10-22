-- Use Dori branding for every existing bank product and any future seeded products.
update public.dori_bank_deposit_products
set name=replace(name,'도토리','돌이'),
    description=replace(description,'도토리','돌이'),
    updated_at=clock_timestamp()
where name like '%도토리%' or description like '%도토리%';

update public.dori_bank_deposits
set product_name=replace(product_name,'도토리','돌이')
where product_name like '%도토리%';

update public.dori_bank_transactions
set description=replace(description,'도토리','돌이')
where description like '%도토리%';
