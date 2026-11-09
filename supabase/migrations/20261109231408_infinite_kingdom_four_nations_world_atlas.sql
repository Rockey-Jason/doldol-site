-- DORI WORLD: INFINITE KINGDOM
-- Four sovereign nations, their regions, diplomacy, chronicles, and shared world events.
-- All figures are fictional worldbuilding/gameplay indices, not real-world statistics.

create table if not exists public.kingdom_nations (
  id text primary key,
  name_ko text not null,
  name_en text not null,
  nation_type text not null,
  capital_ko text not null,
  capital_en text not null,
  government text not null,
  motto text not null,
  emblem text not null,
  flag_design text not null,
  description text not null,
  land_share_percent numeric(5,2) not null check (land_share_percent between 0 and 100),
  land_area_km2 bigint not null check (land_area_km2 > 0),
  population bigint not null check (population > 0),
  power_index smallint not null check (power_index between 0 and 100),
  economy_index smallint not null check (economy_index between 0 and 100),
  science_index smallint not null check (science_index between 0 and 100),
  culture_index smallint not null check (culture_index between 0 and 100),
  infrastructure_index smallint not null check (infrastructure_index between 0 and 100),
  stability_index smallint not null check (stability_index between 0 and 100),
  specialties text[] not null default '{}',
  profile jsonb not null default '{}'::jsonb,
  sort_order smallint not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kingdom_nations_world_lore_ids check (id in ('ggum_song_union','dori_kingdom','sikbbangi_kingdom','winter_federation'))
);

create table if not exists public.kingdom_regions (
  id text primary key,
  nation_id text not null references public.kingdom_nations(id) on delete restrict,
  name_ko text not null,
  name_en text not null,
  region_role text not null,
  description text not null,
  settlement_level text not null,
  sort_order smallint not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.kingdom_diplomacy (
  id text primary key,
  nation_a_id text not null references public.kingdom_nations(id) on delete restrict,
  nation_b_id text not null references public.kingdom_nations(id) on delete restrict,
  agreement_name text not null,
  category text not null,
  status text not null check (status in ('active','proposed','suspended')),
  summary text not null,
  era_year integer not null check (era_year >= 1),
  sort_order smallint not null unique,
  constraint kingdom_diplomacy_distinct_nations check (nation_a_id <> nation_b_id)
);

create table if not exists public.kingdom_chronicles (
  id text primary key,
  nation_id text references public.kingdom_nations(id) on delete set null,
  era_year integer not null check (era_year >= 1),
  title text not null,
  category text not null,
  summary text not null,
  location text not null,
  sort_order smallint not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.kingdom_world_events (
  id text primary key,
  title text not null,
  category text not null,
  status text not null check (status in ('active','scheduled','archived')),
  era_year integer not null check (era_year >= 1),
  schedule_label text not null,
  summary text not null,
  effects jsonb not null default '{}'::jsonb,
  is_featured boolean not null default false,
  sort_order smallint not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.kingdom_world_state (
  id text primary key,
  title text not null,
  era_year integer not null check (era_year >= 1),
  era_label text not null,
  council_name text not null,
  council_status text not null,
  description text not null,
  updated_at timestamptz not null default now()
);

create index if not exists kingdom_regions_nation_sort_idx on public.kingdom_regions(nation_id,sort_order);
create index if not exists kingdom_diplomacy_nation_a_idx on public.kingdom_diplomacy(nation_a_id);
create index if not exists kingdom_diplomacy_nation_b_idx on public.kingdom_diplomacy(nation_b_id);
create index if not exists kingdom_chronicles_nation_year_idx on public.kingdom_chronicles(nation_id,era_year desc);
create index if not exists kingdom_events_status_sort_idx on public.kingdom_world_events(status,sort_order);

alter table public.kingdom_nations enable row level security;
alter table public.kingdom_regions enable row level security;
alter table public.kingdom_diplomacy enable row level security;
alter table public.kingdom_chronicles enable row level security;
alter table public.kingdom_world_events enable row level security;
alter table public.kingdom_world_state enable row level security;

revoke all on table public.kingdom_nations,public.kingdom_regions,public.kingdom_diplomacy,public.kingdom_chronicles,public.kingdom_world_events,public.kingdom_world_state from anon,authenticated;
grant select on table public.kingdom_nations,public.kingdom_regions,public.kingdom_diplomacy,public.kingdom_chronicles,public.kingdom_world_events,public.kingdom_world_state to anon,authenticated;
grant all on table public.kingdom_nations,public.kingdom_regions,public.kingdom_diplomacy,public.kingdom_chronicles,public.kingdom_world_events,public.kingdom_world_state to service_role;

drop policy if exists "Public read kingdom nations" on public.kingdom_nations;
create policy "Public read kingdom nations" on public.kingdom_nations for select to anon,authenticated using (true);
drop policy if exists "Public read kingdom regions" on public.kingdom_regions;
create policy "Public read kingdom regions" on public.kingdom_regions for select to anon,authenticated using (true);
drop policy if exists "Public read kingdom diplomacy" on public.kingdom_diplomacy;
create policy "Public read kingdom diplomacy" on public.kingdom_diplomacy for select to anon,authenticated using (true);
drop policy if exists "Public read kingdom chronicles" on public.kingdom_chronicles;
create policy "Public read kingdom chronicles" on public.kingdom_chronicles for select to anon,authenticated using (true);
drop policy if exists "Public read kingdom events" on public.kingdom_world_events;
create policy "Public read kingdom events" on public.kingdom_world_events for select to anon,authenticated using (true);
drop policy if exists "Public read kingdom world state" on public.kingdom_world_state;
create policy "Public read kingdom world state" on public.kingdom_world_state for select to anon,authenticated using (true);

insert into public.kingdom_nations
(id,name_ko,name_en,nation_type,capital_ko,capital_en,government,motto,emblem,flag_design,description,land_share_percent,land_area_km2,population,power_index,economy_index,science_index,culture_index,infrastructure_index,stability_index,specialties,profile,sort_order)
values
('ggum_song_union','껌•송 연합국','Ggum-Song Union','대륙 연합국','아우렐리온','Aurelion','연합의회제 연방공화정','함께 세우고, 함께 번영한다','✦','샴페인 골드 바탕 · 네 개의 별을 감싼 연합 문장','네 나라가 함께하는 세계 질서의 중심이자 가장 넓은 영토와 높은 종합 국력을 보유한 초대형 연합국. 광대한 대륙과 촘촘한 교통망, 강력한 산업·금융 기반을 바탕으로 4국 문명협의회를 이끈다.',46,18400000,338000000,100,98,95,91,97,96,array['대륙 규모의 산업·물류','국제 금융과 교역','광역 교통 인프라','대형 과학기술 단지'],'{"capitalDistrict":"아우렐리온 중앙수도권","governmentSeat":"연합의사당","nationalCharacter":"다양한 지역과 문화를 잇는 개방형 연합 문명","landmarks":["오브 연합의사당","그랜드 센트럴 역","천성 대륙공원"],"specialNote":"영토 규모와 종합 국력에서 네 나라 중 가장 크고 강한 국가로 설정"}'::jsonb,1),
('dori_kingdom','돌이 왕국','Dori Kingdom','입헌 왕국','로키아','Rokia','입헌군주제 · 왕립의회','호기심과 용기로 세계를 밝힌다','🐾','딥 네이비 바탕 · 샴페인 골드 왕관과 코기 발자국','돌이의 이름과 상징을 계승하는 왕국. 로키아를 중심으로 금융·도로늄 산업·역사문화·우주개발을 균형 있게 발전시키며, 왕립 박물관과 연구기관을 통해 세계의 지식과 유산을 보존한다.',23,9200000,162000000,88,89,97,100,88,94,array['도로늄 산업과 연구','왕립 박물관과 역사문화','금융 서비스','우주 탐사와 기술혁신'],'{"capitalDistrict":"로키아 왕도","governmentSeat":"왕실의회","nationalCharacter":"탐구·창의·기록을 중시하는 지식 산업 문명","landmarks":["로키아 왕궁","왕립 도로늄 박물관","돌이 중앙광장"],"characterReference":"돌이를 상징하는 웰시코기 문장"}'::jsonb,2),
('sikbbangi_kingdom','식빵이 왕국','Sikbbangi Kingdom','문화 왕국','브레드하임','Breadheim','문화의회제 입헌왕정','따뜻함은 나눌수록 커진다','🍞','버터 크림색 바탕 · 황금빛 빵 문장과 고양이 별','식빵이의 빵처럼 포근한 형태와 고양이 상징에서 영감을 받은 문화 왕국. 아름다운 해안과 정원 도시, 도서관·예술원·환대 산업을 중심으로 시민의 삶과 문화유산을 소중히 여긴다.',16,6400000,94000000,76,82,85,99,84,95,array['문화·예술·출판','정원과 해안 도시','환대·관광 산업','교육과 생활문화'],'{"capitalDistrict":"브레드하임 왕도","governmentSeat":"문화의회","nationalCharacter":"따뜻한 환대와 생활문화, 예술을 중시하는 문명","landmarks":["식빵이 왕실정원","브레드하임 대도서관","크림빛 해안 산책로"],"characterReference":"식빵 모양 고양이 식빵이의 상징을 반영"}'::jsonb,3),
('winter_federation','윈터 연방','Winter Federation','극지 연방국','설휘아','Seolhuia','연방의회제 공화정','고요함 속에서 미래를 찾는다','❄','아이스 블루 바탕 · 은빛 오로라와 설화 문장','차가운 북부의 자연과 오로라를 상징하는 과학 중심 연방국. 극지 관측, 기후 연구, 청정에너지, 천문과 우주과학에 특화되어 있으며 자연환경을 보전하면서 첨단 연구도시를 발전시킨다.',15,6000000,71000000,84,86,100,88,82,92,array['극지·기후 과학','오로라·천문 관측','청정에너지 연구','빙하 환경 보전'],'{"capitalDistrict":"설휘아 연방수도권","governmentSeat":"윈터 연방의사당","nationalCharacter":"과학적 탐구와 자연 보전을 함께 추구하는 북부 문명","landmarks":["오로라 관측궁","설백 과학도시","빙하 생태보전원"],"characterReference":"윈터의 이름에서 영감을 받은 겨울·극지 연구 문명"}'::jsonb,4)
on conflict(id) do update set name_ko=excluded.name_ko,name_en=excluded.name_en,nation_type=excluded.nation_type,capital_ko=excluded.capital_ko,capital_en=excluded.capital_en,government=excluded.government,motto=excluded.motto,emblem=excluded.emblem,flag_design=excluded.flag_design,description=excluded.description,land_share_percent=excluded.land_share_percent,land_area_km2=excluded.land_area_km2,population=excluded.population,power_index=excluded.power_index,economy_index=excluded.economy_index,science_index=excluded.science_index,culture_index=excluded.culture_index,infrastructure_index=excluded.infrastructure_index,stability_index=excluded.stability_index,specialties=excluded.specialties,profile=excluded.profile,sort_order=excluded.sort_order,updated_at=now();

insert into public.kingdom_regions(id,nation_id,name_ko,name_en,region_role,description,settlement_level,sort_order) values
('gs-aurelion','ggum_song_union','아우렐리온 수도권','Aurelion Capital','연합 수도','연합의사당과 외교기관, 중앙광장이 모여 있는 세계 최대 규모의 수도권.','세계수도',1),
('gs-crownland','ggum_song_union','북부 크라운랜드','Northern Crownland','연구·교육','대학과 대형 연구단지, 고원 자연보호구역이 공존하는 북부 지역.','광역 연구권',2),
('gs-eastport','ggum_song_union','동부 항만주','Eastern Ports','무역·물류','대륙 간 교역을 연결하는 국제항만과 물류도시가 이어진 해안 지역.','국제항만권',3),
('gs-southworks','ggum_song_union','남부 산업주','Southern Works','산업·제조','첨단 제조업과 대형 물류 시설이 집적된 연합국의 산업 중심지.','메가 산업권',4),
('gs-westfield','ggum_song_union','서부 초원주','Western Fields','농업·생태','광활한 초원과 농업도시, 생태공원이 자리한 서부 지역.','광역 생태권',5),
('dori-rokia','dori_kingdom','로키아 왕도','Rokia Royal Capital','왕실·행정','왕궁과 왕립의회, 중앙광장이 자리한 돌이 왕국의 중심 도시.','왕도',6),
('dori-finance','dori_kingdom','금융특별구','Finance District','금융','돌이은행과 돌돌증권, 국가 금융기관이 연결되는 금융 중심지.','특별구',7),
('dori-industry','dori_kingdom','산업특별구','Industry District','도로늄 산업','도로늄 공장과 소재 연구기관이 모여 있는 첨단 산업 지역.','특별구',8),
('dori-culture','dori_kingdom','역사문화구','Heritage District','박물관·문화','왕립 박물관과 도서관, 기록관이 있는 역사문화 중심지.','특별구',9),
('dori-orbit','dori_kingdom','우주개발구','Space Development District','우주과학','우주개발센터와 천문 연구소가 있는 미래 산업 지역.','특별구',10),
('dori-nature','dori_kingdom','자연보호구','Nature Reserve','환경·생태','숲과 호수, 야생 생태계를 보존하는 국가 자연보호 지역.','보호구역',11),
('sik-breadheim','sikbbangi_kingdom','브레드하임 수도권','Breadheim Capital','수도·문화','문화의회와 대도서관, 왕실정원이 있는 문화 왕국의 수도.','왕도',12),
('sik-toastplain','sikbbangi_kingdom','토스트 평원주','Toast Plains','생활·농업','따뜻한 평원과 작은 마을, 전통시장과 생활문화 공간이 이어진 지역.','문화 농업권',13),
('sik-buttercoast','sikbbangi_kingdom','버터 해안주','Butter Coast','관광·해양문화','해안 산책로와 항구 마을, 문화 축제가 열리는 해안 지역.','해안 문화권',14),
('sik-creamgarden','sikbbangi_kingdom','크림 정원구','Cream Gardens','정원·예술','식물원과 예술원, 교육시설이 모여 있는 정원 도시 지역.','정원 특별구',15),
('win-seolhuia','winter_federation','설휘아 수도권','Seolhuia Capital','수도·행정','연방의사당과 오로라 관측 시설을 갖춘 북부 수도.','연방수도',16),
('win-snowrange','winter_federation','설백 산맥주','Whitepeak Range','자연·환경','빙하와 설산, 고산 생태계를 보호하는 북부 자연 지역.','자연보전권',17),
('win-aurora','winter_federation','오로라 관측구','Aurora Observatory','천문·우주과학','오로라와 우주 기상을 관측하는 연구소가 집중된 과학 지역.','국가 연구구',18),
('win-glacier','winter_federation','빙하 연구주','Glacier Research','기후·청정에너지','빙하 환경과 기후변화를 연구하고 청정에너지 기술을 시험하는 지역.','연구 특별구',19)
on conflict(id) do update set nation_id=excluded.nation_id,name_ko=excluded.name_ko,name_en=excluded.name_en,region_role=excluded.region_role,description=excluded.description,settlement_level=excluded.settlement_level,sort_order=excluded.sort_order;

insert into public.kingdom_diplomacy(id,nation_a_id,nation_b_id,agreement_name,category,status,summary,era_year,sort_order) values
('diplomacy-gs-dori','ggum_song_union','dori_kingdom','연합 핵심협력·무역협정','전략·경제','active','껌•송 연합국과 돌이 왕국은 금융·산업·과학기술 교류를 확대하고 4국 문명협의회의 공동 프로젝트를 함께 추진한다.',40,1),
('diplomacy-gs-sik','ggum_song_union','sikbbangi_kingdom','문화·교역 교류협정','문화·경제','active','양국은 문화 박람회와 생활문화 교류, 안정적인 교역로 운영을 공동으로 추진한다.',42,2),
('diplomacy-gs-win','ggum_song_union','winter_federation','극지·과학기술 공동연구협정','과학·환경','active','대륙 연합국의 연구 인프라와 윈터 연방의 극지·천문 연구 역량을 연결한다.',44,3),
('diplomacy-dori-sik','dori_kingdom','sikbbangi_kingdom','형제국 문화교류 협약','문화','active','돌이 왕국과 식빵이 왕국은 공동 전시, 도서 교류, 왕실 문화행사를 이어가는 우호 관계다.',46,4),
('diplomacy-dori-win','dori_kingdom','winter_federation','첨단소재·기후과학 협력','과학·산업','active','도로늄 소재 연구와 윈터의 기후·청정에너지 연구를 연결하는 공동 연구 협약이다.',48,5),
('diplomacy-sik-win','sikbbangi_kingdom','winter_federation','북부 관광·문화교류 협정','문화·관광','active','식빵이 왕국의 정원·해안 문화와 윈터 연방의 오로라·설산 관광을 연결한다.',50,6)
on conflict(id) do update set nation_a_id=excluded.nation_a_id,nation_b_id=excluded.nation_b_id,agreement_name=excluded.agreement_name,category=excluded.category,status=excluded.status,summary=excluded.summary,era_year=excluded.era_year,sort_order=excluded.sort_order;

insert into public.kingdom_chronicles(id,nation_id,era_year,title,category,summary,location,sort_order) values
('chronicle-four-origin',null,1,'네 문명의 기원','건국','서로 다른 자연환경과 가치관을 가진 네 나라가 각자의 터전에서 문명을 세우기 시작했다.','인피니티 대륙',1),
('chronicle-gs-union','ggum_song_union',12,'껌•송 연합국 성립','건국','여러 지역 공동체가 연합 헌장을 채택하며 하나의 거대한 연합국으로 출범했다.','아우렐리온',2),
('chronicle-dori-royal','dori_kingdom',18,'로키아 왕도 건설','건국','돌이 왕국의 왕궁과 왕립의회가 로키아에 자리 잡으며 수도 체계가 완성되었다.','로키아',3),
('chronicle-sik-culture','sikbbangi_kingdom',24,'식빵이 왕국 문화헌장 선포','문화','식빵이 왕국은 환대와 예술, 교육을 국가 발전의 핵심 가치로 정한 문화헌장을 선포했다.','브레드하임',4),
('chronicle-winter-federation','winter_federation',32,'윈터 연방 출범','건국','북부 도시와 연구 공동체가 연방 협약을 체결해 윈터 연방을 구성했다.','설휘아',5),
('chronicle-council',null,40,'4국 문명협의회 발족','외교','네 나라는 각자의 주권을 존중하면서 교류와 공동 프로젝트를 논의하는 4국 문명협의회를 출범시켰다.','아우렐리온 국제회의장',6),
('chronicle-dori-museum','dori_kingdom',52,'왕립 도로늄 박물관 개관','문화·과학','도로늄과 왕국의 산업·문화 유산을 연구하고 보존하는 왕립 박물관이 공식 개관했다.','역사문화구',7),
('chronicle-gs-rail','ggum_song_union',67,'대륙 순환 고속철도 개통','인프라','아우렐리온과 동부 항만, 남부 산업주를 연결하는 대륙 순환 철도망이 개통되었다.','껌•송 연합국',8),
('chronicle-winter-aurora','winter_federation',78,'오로라 관측궁 완공','과학','윈터 연방의 오로라 관측궁이 완공되어 4국 공동 천문 연구의 거점이 되었다.','오로라 관측구',9),
('chronicle-sik-expo','sikbbangi_kingdom',84,'세계 생활문화 박람회 개최','문화','식빵이 왕국이 주최한 박람회에서 네 나라의 예술·출판·생활문화가 소개되었다.','브레드하임',10),
('chronicle-infinity',null,100,'인피니티 시대 개막','문명 진화','네 나라가 공동 발전의 새 시대를 선언하며 인피니티 문명 계획을 시작했다.','4국 공동 선언장',11)
on conflict(id) do update set nation_id=excluded.nation_id,era_year=excluded.era_year,title=excluded.title,category=excluded.category,summary=excluded.summary,location=excluded.location,sort_order=excluded.sort_order;

insert into public.kingdom_world_events(id,title,category,status,era_year,schedule_label,summary,effects,is_featured,sort_order) values
('event-four-civilization-expo','제1회 4국 문명 박람회','국제 행사','active',100,'인피니티 시대 · 상시 개최','껌•송 연합국, 돌이 왕국, 식빵이 왕국, 윈터 연방이 각자의 대표 기술과 문화유산을 함께 전시하는 세계 박람회.','{"culture":"네 나라의 문화 교류 기록 증가","diplomacy":"공동 협약과 연구 프로젝트 소개","museum":"각국 대표 전시관 개방"}'::jsonb,true,1),
('event-aurora-week','윈터 오로라 관측 주간','과학 행사','scheduled',101,'왕국력 101년 예정','윈터 연방의 오로라 관측구에서 열리는 공개 천문·기후 과학 행사.','{"science":"천문·기후 과학 콘텐츠 해금","tourism":"북부 지역 방문 지표 증가"}'::jsonb,false,2),
('event-heritage-festival','형제국 문화유산 교류제','문화 행사','scheduled',102,'왕국력 102년 예정','돌이 왕국과 식빵이 왕국이 공동 개최하는 역사·출판·정원 문화 축제.','{"culture":"공동 전시와 도서 교류","chronicle":"공동 역사 기록 추가"}'::jsonb,false,3)
on conflict(id) do update set title=excluded.title,category=excluded.category,status=excluded.status,era_year=excluded.era_year,schedule_label=excluded.schedule_label,summary=excluded.summary,effects=excluded.effects,is_featured=excluded.is_featured,sort_order=excluded.sort_order;

insert into public.kingdom_world_state(id,title,era_year,era_label,council_name,council_status,description)
values('infinite-kingdom','DORI WORLD: INFINITE KINGDOM',100,'왕국력 100년 · 인피니티 시대','4국 문명협의회','ACTIVE','껌•송 연합국, 돌이 왕국, 식빵이 왕국, 윈터 연방. 네 주권국이 각자의 문화를 유지하면서 하나의 문명권을 이루는 세계.')
on conflict(id) do update set title=excluded.title,era_year=excluded.era_year,era_label=excluded.era_label,council_name=excluded.council_name,council_status=excluded.council_status,description=excluded.description,updated_at=now();
