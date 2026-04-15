import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/setup — One-time database initialization
// Visit this URL once after deploy to create table + seed 50 items
export async function GET() {
  try {
    const sql = getDb();

    // Check if table already exists
    const check = await sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'equipment')`;
    if (check[0]?.exists) {
      const count = await sql`SELECT count(*) as c FROM equipment`;
      return NextResponse.json({ status: "already_initialized", items: count[0].c });
    }

    // Create table
    await sql`
      CREATE TABLE equipment (
        id SERIAL PRIMARY KEY,
        cat TEXT NOT NULL DEFAULT 'additional',
        he TEXT NOT NULL DEFAULT '',
        en TEXT DEFAULT '',
        qty INTEGER,
        st TEXT NOT NULL DEFAULT 'new',
        notes TEXT DEFAULT '',
        co TEXT DEFAULT '',
        dim_l TEXT DEFAULT '',
        dim_w TEXT DEFAULT '',
        dim_h TEXT DEFAULT '',
        dim_d TEXT DEFAULT '',
        wt TEXT DEFAULT '',
        url TEXT DEFAULT '',
        shape TEXT NOT NULL DEFAULT 'box',
        photos JSONB DEFAULT '[]'::jsonb,
        video JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Auto-update trigger
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END;
      $$ LANGUAGE plpgsql
    `;
    await sql`CREATE TRIGGER equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at()`;

    // Seed all 50 items
    await sql`INSERT INTO equipment (id,cat,he,en,qty,st,notes,co,shape) VALUES
      (1,'protection','חליפות חומ"ס LEVEL A עם אוורור פנימי — כפפות בוטיליות, הזעה וקוולאר בארגז','HazMat Level A Suits — full kit in case',6,'existing','HPS/EVO','','box'),
      (2,'protection','חליפות חומ"ס LEVEL B','HazMat Level B Suits',4,'existing','TESIMAX SYKAN 5','TESIMAX','box'),
      (3,'protection','מנ"פ עם מערכת שמע דיבור','SCBA with voice comm',6,'existing','דרגר','Dräger','irregular'),
      (4,'protection','מכל אוויר דחוס 9 ליטר','9L compressed air cylinder',6,'existing','','','cylinder'),
      (5,'protection','פנסים מוגן התפוצצות נטען LED','Explosion-proof LED flashlights',6,'existing','','','long'),
      (6,'protection','מגפי חומ"ס','HazMat boots',10,'existing','','','irregular'),
      (7,'protection','כפפות קריאוגניות','Cryogenic gloves (pairs)',2,'existing','זוגות','','bag'),
      (8,'protection','קסדות חילוץ קלות','Lightweight rescue helmets',10,'existing','','','irregular'),
      (9,'protection','קו חיים (חבל) 100 מ''','Lifeline rope 100m',1,'existing','','','cylinder'),
      (10,'stabilization','שרוולי ספיגה אוניברסאליים','Universal absorbent sleeves',10,'existing','','','long'),
      (11,'stabilization','שק עם חומר ספיחה','Sorbent material bag',1,'existing','','','bag'),
      (12,'stabilization','יריעת כיסוי','Cover sheet',1,'existing','','','bag'),
      (13,'stabilization','מאצרה ניידת','Portable containment berm',1,'existing','','','box'),
      (14,'stabilization','מפוח מוגן נפיצות','Explosion-proof blower',1,'existing','','','box'),
      (15,'containment','ערכת שרוול נחש — צנרת לחץ גבוה','Snake sleeve kit',1,'existing','עד 14 בר','','box'),
      (16,'containment','ערכת רצועות קבועות — לחץ גבוה','Fixed strap kit',1,'existing','עד 12 בר','','box'),
      (17,'containment','ערכת אטימה סביבל','Swivel sealing kit',1,'existing','עד 1.5 בר','','box'),
      (18,'containment','ערכת אדם בודד','One-person sealing kit',1,'existing','עד 1.5 בר','','bag'),
      (19,'containment','ערכת תחבושות איטום','Sealing bandage kit',1,'existing','עד 1.5 בר','','box'),
      (20,'containment','ערכת חבקי מתכת','Metal clamp kit',1,'existing','עד 16 בר','','box'),
      (21,'containment','ערכת אטימה AE','AE Sealing kit',1,'existing','עד 1.5 בר','','box'),
      (22,'containment','ערכת אטימה A2','A2 Sealing kit',1,'existing','עד 1.5 בר','','box'),
      (23,'containment','ערכת אטימה מגנטית','Magnetic sealing kit',1,'existing','עד 1.7 בר','','box'),
      (24,'containment','ערכת אטימה בוואקום','Vacuum sealing kit',1,'existing','עד 1.4 בר','','box'),
      (25,'containment','חביות איסוף (הנצלה)','Salvage drums',2,'existing','גדלים שונים','','cylinder'),
      (26,'containment','שואב אבק + משאבת נוזלים','Vacuum + liquid pump',1,'existing','VETTER MPA 2.0 MWF','VETTER','box'),
      (27,'containment','מטף כיבוי מתכות','Metal fire extinguisher',1,'existing','','','cylinder'),
      (28,'containment','ערכת כלי עבודה מוגני ניצוצות','Spark-proof tool kit',1,'existing','','','box'),
      (29,'containment','סולם במה לעבודה בגובה','Platform ladder',1,'existing','','','long'),
      (30,'containment','דליים','Buckets',4,'existing','','','cylinder'),
      (31,'containment','את חפירה','Shovel',4,'existing','','','long'),
      (32,'containment','מטאטא כביש','Street broom',2,'existing','','','long'),
      (33,'containment','עגלה להובלת ציוד','Equipment cart',2,'existing','','','box'),
      (34,'monitoring','ערכת ניטור מלאה + טעינה','Full monitoring kit + charging',1,'existing','מכשירים חדשים — בעתיד','','box'),
      (35,'monitoring','ערכת תאורה ניידת','Portable lighting kit',1,'existing','','','box'),
      (36,'monitoring','מצלמה תרמית','Thermal camera',1,'existing','','','box'),
      (37,'monitoring','שבשבת מטאורולוגית ניידת','Portable weather station',1,'existing','','','irregular'),
      (38,'monitoring','משקפת + מד מרחק לייזר','Binoculars + laser rangefinder',1,'existing','','','box'),
      (39,'monitoring','מערכת שליטת זמן אוויר + טאבלט','Air time management + tablet',1,'existing','Merlin — רכבים חדשים','Merlin','box'),
      (40,'monitoring','ערכות סימון זירה (סס"ל / תאורה)','Scene marking kits',1,'existing','','','box'),
      (41,'monitoring','טבלט לפיד + אפליקציות חומ"ס','Torch tablet + HazMat apps',1,'existing','ERG, EURO RESCUE','','box'),
      (42,'additional','Ultra-Spill Deck® P4 — מאצרה מתקפלת','Ultra-Spill Deck Flexible P4',2,'new','קבולת 420 ל''','Ultratech','box'),
      (43,'additional','שקית אגירה חלופית — Replacement Bladder','Replacement Bladder',4,'new','','Ultratech','bag'),
      (44,'additional','ULTRA POP-UP POOL® PLUS — מאצרה','Ultra Pop-Up Pool Plus',5,'new','','Ultratech','box'),
      (45,'additional','Kärcher 36V K2 — מכונת שטיפה ניידת','Kärcher 36V K2 Pressure Washer',4,'new','110 בר','Kärcher','box'),
      (46,'additional','STEED סבל חשמלי','STEED Electric Stair Climber',1,'new','','Hendrick','box'),
      (47,'additional','מדחס אוויר Nuvair MCH16','Nuvair Air Compressor MCH16',1,'new','','Coltri','box'),
      (48,'additional','ורמיקוליט — חומר ספיחה 20 ל''','Vermiculite Sorbent 20L',NULL,'new','','','bag'),
      (49,'additional','רחפן + מצלמה תרמית, טווח 5+ ק"מ','Drone + thermal cam >5km',NULL,'new','שידור לאחור','','irregular'),
      (50,'additional','טלוויזיה חכמה 65" מגע + חיבור PC','65" Smart Touch TV + PC',NULL,'new','','','box')
    `;

    // Update items with dimensions
    await sql`UPDATE equipment SET dim_l='122',dim_w='61',dim_h='15',wt='22.7',url='https://spillcontainment.com/products/ultra-spill-deck-flexible-model/' WHERE id=42`;
    await sql`UPDATE equipment SET dim_l='167',dim_w='15',dim_h='15',wt='9' WHERE id=43`;
    await sql`UPDATE equipment SET dim_l='147',dim_w='30',dim_h='30',wt='4' WHERE id=44`;
    await sql`UPDATE equipment SET dim_l='24.5',dim_w='30.3',dim_h='62.9',wt='4.5' WHERE id=45`;
    await sql`UPDATE equipment SET dim_l='99.1',dim_w='76.2',dim_h='63.5',wt='86.2',url='https://www.hendrickusa.com/steed' WHERE id=46`;
    await sql`UPDATE equipment SET dim_l='86',dim_w='46',dim_h='64',wt='105' WHERE id=47`;
    await sql`UPDATE equipment SET wt='5' WHERE id=48`;
    await sql`UPDATE equipment SET wt='2' WHERE id=49`;
    await sql`UPDATE equipment SET dim_l='145',dim_w='85',dim_h='7',wt='20' WHERE id=50`;

    // Reset sequence
    await sql`SELECT setval('equipment_id_seq', (SELECT MAX(id) FROM equipment))`;

    const count = await sql`SELECT count(*) as c FROM equipment`;
    return NextResponse.json({ status: "initialized", items: count[0].c, message: "✅ Database ready with 50 items!" });

  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
