import "dotenv/config";
import { ObjectId } from "mongodb";
import { connectToDatabase, closeDatabase } from "./connection.js";
import type { ShelterCreateInput, RiskZoneCreateInput } from "@rakkhanet/shared-types";
import { computeRiskScore } from "../lib/riskScoring.js";

/**
 * Approximate district-center coordinates [lng, lat] -- illustrative for
 * seed/demo data, not survey-precise. Covers a spread of Bangladesh's
 * flood-prone (Jamuna/Brahmaputra basin, haor) and cyclone-prone (coastal)
 * districts, not just Chattogram/Feni, so the map doesn't look like a
 * single-city demo.
 */
const DISTRICTS = {
  chattogram: [91.7832, 22.3569],
  feni: [91.4372, 22.8494],
  cumilla: [91.1809, 23.4607],
  noakhali: [91.0989, 22.8236],
  coxsbazar: [92.0058, 21.4272],
  sylhet: [91.8687, 24.8949],
  sirajganj: [89.7006, 24.4533],
  bogura: [89.3773, 24.8465],
  rangpur: [89.2752, 25.7439],
  gaibandha: [89.5285, 25.3288],
  barguna: [90.1121, 22.0953],
  patuakhali: [90.3296, 22.3596],
} as const;

function squarePolygon(centerLng: number, centerLat: number, delta = 0.04) {
  return [
    [
      [centerLng - delta, centerLat - delta],
      [centerLng + delta, centerLat - delta],
      [centerLng + delta, centerLat + delta],
      [centerLng - delta, centerLat + delta],
      [centerLng - delta, centerLat - delta],
    ],
  ];
}

// Reused across relief_requests so the dashboard shows the same few "people"
// submitting/handling multiple requests, like a real small dataset would --
// not real Better Auth accounts, just valid-shaped placeholder ObjectIds.
const FAKE_CITIZENS = Array.from({ length: 5 }, () => new ObjectId());
const FAKE_VOLUNTEERS = Array.from({ length: 3 }, () => new ObjectId());

const shelters: ShelterCreateInput[] = [
  {
    name: "Chattogram Government College Shelter",
    location: { type: "Point", coordinates: DISTRICTS.chattogram as [number, number] },
    address: "Enayet Bazar, Chattogram",
    capacity: 500,
    currentOccupancy: 120,
    resources: [
      { type: "food", available: true },
      { type: "water", available: true },
      { type: "medicine", available: false },
    ],
    contactPerson: "Md. Alam",
    contactPhone: "+8801700000001",
    status: "open",
  },
  {
    name: "Chattogram Collegiate School Shelter",
    location: { type: "Point", coordinates: [91.8317, 22.3627] },
    address: "Nandankanan, Chattogram",
    capacity: 300,
    currentOccupancy: 300,
    resources: [
      { type: "food", available: false },
      { type: "water", available: true },
    ],
    contactPerson: "Shirin Akter",
    status: "full",
  },
  {
    name: "Sonagazi Union Primary School Shelter",
    location: { type: "Point", coordinates: DISTRICTS.feni as [number, number] },
    address: "Sonagazi, Feni",
    capacity: 200,
    currentOccupancy: 200,
    resources: [{ type: "food", available: false }],
    contactPerson: "Rina Begum",
    status: "full",
  },
  {
    name: "Feni Government Pilot High School Shelter",
    location: { type: "Point", coordinates: [91.3958, 22.9436] },
    address: "Feni Sadar, Feni",
    capacity: 350,
    currentOccupancy: 80,
    resources: [
      { type: "food", available: true },
      { type: "water", available: true },
      { type: "blankets", available: true },
    ],
    contactPerson: "Kamal Hossain",
    contactPhone: "+8801700000002",
    status: "open",
  },
  {
    name: "Cumilla Victoria Government College Shelter",
    location: { type: "Point", coordinates: DISTRICTS.cumilla as [number, number] },
    address: "Kandirpar, Cumilla",
    capacity: 400,
    currentOccupancy: 150,
    resources: [
      { type: "food", available: true },
      { type: "water", available: true },
    ],
    contactPerson: "Farida Yasmin",
    status: "open",
  },
  {
    name: "Noakhali Science & Technology University Shelter",
    location: { type: "Point", coordinates: DISTRICTS.noakhali as [number, number] },
    address: "Sonapur, Noakhali",
    capacity: 600,
    currentOccupancy: 0,
    resources: [
      { type: "food", available: true },
      { type: "water", available: true },
      { type: "medicine", available: true },
    ],
    contactPerson: "Dr. Jasim Uddin",
    contactPhone: "+8801700000003",
    status: "open",
  },
  {
    name: "Cox's Bazar Government High School Shelter",
    location: { type: "Point", coordinates: DISTRICTS.coxsbazar as [number, number] },
    address: "Cox's Bazar Sadar",
    capacity: 450,
    currentOccupancy: 410,
    resources: [
      { type: "water", available: true },
      { type: "blankets", available: false },
    ],
    contactPerson: "Nurul Amin",
    status: "open",
  },
  {
    name: "Sylhet MC College Shelter",
    location: { type: "Point", coordinates: DISTRICTS.sylhet as [number, number] },
    address: "Tilagor, Sylhet",
    capacity: 500,
    currentOccupancy: 60,
    resources: [
      { type: "food", available: true },
      { type: "water", available: true },
    ],
    contactPerson: "Abdul Kadir",
    status: "open",
  },
  {
    name: "Sirajganj Government College Shelter",
    location: { type: "Point", coordinates: DISTRICTS.sirajganj as [number, number] },
    address: "Sirajganj Sadar",
    capacity: 300,
    currentOccupancy: 290,
    resources: [
      { type: "food", available: false },
      { type: "water", available: false },
    ],
    contactPerson: "Mafuza Khatun",
    status: "open",
  },
  {
    name: "Bogura Cantonment Public School Shelter",
    location: { type: "Point", coordinates: DISTRICTS.bogura as [number, number] },
    address: "Cantonment Area, Bogura",
    capacity: 250,
    currentOccupancy: 0,
    resources: [],
    contactPerson: "Major Shamim (Retd.)",
    status: "closed",
  },
  {
    name: "Rangpur Carmichael College Shelter",
    location: { type: "Point", coordinates: DISTRICTS.rangpur as [number, number] },
    address: "College Road, Rangpur",
    capacity: 400,
    currentOccupancy: 50,
    resources: [
      { type: "food", available: true },
      { type: "water", available: true },
    ],
    contactPerson: "Rezaul Karim",
    status: "open",
  },
  {
    name: "Gaibandha Government College Shelter",
    location: { type: "Point", coordinates: DISTRICTS.gaibandha as [number, number] },
    address: "Gaibandha Sadar",
    capacity: 280,
    currentOccupancy: 275,
    resources: [{ type: "food", available: false }],
    contactPerson: "Selina Parvin",
    status: "full",
  },
  {
    name: "Barguna Government College Shelter",
    location: { type: "Point", coordinates: DISTRICTS.barguna as [number, number] },
    address: "Barguna Sadar",
    capacity: 350,
    currentOccupancy: 100,
    resources: [
      { type: "food", available: true },
      { type: "water", available: true },
      { type: "blankets", available: true },
    ],
    contactPerson: "Habibur Rahman",
    contactPhone: "+8801700000004",
    status: "open",
  },
  {
    name: "Patuakhali Government Women's College Shelter",
    location: { type: "Point", coordinates: DISTRICTS.patuakhali as [number, number] },
    address: "Patuakhali Sadar",
    capacity: 320,
    currentOccupancy: 90,
    resources: [
      { type: "food", available: true },
      { type: "medicine", available: true },
    ],
    contactPerson: "Nasrin Sultana",
    status: "open",
  },
];

// Inputs chosen to spread across all four risk bands (see riskScoring.ts) --
// illustrative values matching the v1 scorer's expected ranges, not real
// meteorological readings.
const riskZoneInputs: {
  region: string;
  hazardType: RiskZoneCreateInput["hazardType"];
  inputs: NonNullable<RiskZoneCreateInput["inputs"]>;
}[] = [
  { region: "Sirajganj (Jamuna basin)", hazardType: "flood", inputs: { rainfallMm: 210, riverLevelM: 8.5, elevationM: 2 } },
  { region: "Gaibandha (Brahmaputra basin)", hazardType: "flood", inputs: { rainfallMm: 195, riverLevelM: 7.8, elevationM: 3 } },
  { region: "Bogura", hazardType: "flood", inputs: { rainfallMm: 140, riverLevelM: 6.2, elevationM: 5 } },
  { region: "Sylhet (haor area)", hazardType: "flood", inputs: { rainfallMm: 160, riverLevelM: 5.5, elevationM: 4 } },
  { region: "Sonagazi, Feni", hazardType: "flood", inputs: { rainfallMm: 130, riverLevelM: 5.0, elevationM: 6 } },
  { region: "Cumilla", hazardType: "flood", inputs: { rainfallMm: 95, riverLevelM: 3.8, elevationM: 8 } },
  { region: "Noakhali", hazardType: "flood", inputs: { rainfallMm: 100, riverLevelM: 4.2, elevationM: 7 } },
  { region: "Chattogram Metro", hazardType: "flood", inputs: { rainfallMm: 110, riverLevelM: 3.0, elevationM: 9 } },
  { region: "Cox's Bazar Coast", hazardType: "cyclone", inputs: { rainfallMm: 90, riverLevelM: 2.0, elevationM: 10 } },
  { region: "Barguna Coast", hazardType: "cyclone", inputs: { rainfallMm: 85, riverLevelM: 1.8, elevationM: 11 } },
  { region: "Patuakhali Coast", hazardType: "cyclone", inputs: { rainfallMm: 70, riverLevelM: 1.5, elevationM: 12 } },
  { region: "Rangpur", hazardType: "flood", inputs: { rainfallMm: 30, riverLevelM: 0.8, elevationM: 18 } },
];

const districtKeyByRegion: Record<string, keyof typeof DISTRICTS> = {
  "Sirajganj (Jamuna basin)": "sirajganj",
  "Gaibandha (Brahmaputra basin)": "gaibandha",
  Bogura: "bogura",
  "Sylhet (haor area)": "sylhet",
  "Sonagazi, Feni": "feni",
  Cumilla: "cumilla",
  Noakhali: "noakhali",
  "Chattogram Metro": "chattogram",
  "Cox's Bazar Coast": "coxsbazar",
  "Barguna Coast": "barguna",
  "Patuakhali Coast": "patuakhali",
  Rangpur: "rangpur",
};

const reliefRequests = [
  { requesterId: FAKE_CITIZENS[0], location: DISTRICTS.feni, description: "Family of 5 stranded on rooftop near Sonagazi bazar, water still rising, need boat rescue.", category: "rescue", priority: "critical", status: "pending", assignedVolunteerId: null },
  { requesterId: FAKE_CITIZENS[1], location: DISTRICTS.feni, description: "Elderly diabetic patient out of insulin, needs urgent medicine delivery.", category: "medical", priority: "critical", status: "assigned", assignedVolunteerId: FAKE_VOLUNTEERS[0] },
  { requesterId: FAKE_CITIZENS[2], location: DISTRICTS.chattogram, description: "Ran out of dry food for 3 days, family of 4.", category: "food", priority: "medium", status: "resolved", assignedVolunteerId: FAKE_VOLUNTEERS[1] },
  { requesterId: FAKE_CITIZENS[3], location: DISTRICTS.chattogram, description: "Home flooded, need transport to nearest shelter, have 2 young children.", category: "shelter", priority: "high", status: "pending", assignedVolunteerId: null },
  { requesterId: FAKE_CITIZENS[4], location: DISTRICTS.cumilla, description: "Pregnant woman needs to reach hospital, roads partially flooded.", category: "medical", priority: "high", status: "in_progress", assignedVolunteerId: FAKE_VOLUNTEERS[1] },
  { requesterId: FAKE_CITIZENS[0], location: DISTRICTS.noakhali, description: "Temporary camp of 30 people running low on drinking water.", category: "food", priority: "medium", status: "pending", assignedVolunteerId: null },
  { requesterId: FAKE_CITIZENS[1], location: DISTRICTS.coxsbazar, description: "Fishing family trapped by storm surge near the coast.", category: "rescue", priority: "critical", status: "assigned", assignedVolunteerId: FAKE_VOLUNTEERS[2] },
  { requesterId: FAKE_CITIZENS[2], location: DISTRICTS.sylhet, description: "Flash flood damaged home, relocated to MC College shelter.", category: "shelter", priority: "medium", status: "resolved", assignedVolunteerId: FAKE_VOLUNTEERS[0] },
  { requesterId: FAKE_CITIZENS[3], location: DISTRICTS.sirajganj, description: "Need information on when water levels are expected to recede.", category: "other", priority: "low", status: "pending", assignedVolunteerId: null },
  { requesterId: FAKE_CITIZENS[4], location: DISTRICTS.bogura, description: "Minor injuries from debris, need first aid supplies.", category: "medical", priority: "medium", status: "pending", assignedVolunteerId: null },
  { requesterId: FAKE_CITIZENS[0], location: DISTRICTS.rangpur, description: "Requested dry food packets for family of 6.", category: "food", priority: "low", status: "resolved", assignedVolunteerId: FAKE_VOLUNTEERS[2] },
  { requesterId: FAKE_CITIZENS[1], location: DISTRICTS.gaibandha, description: "Shelter at capacity, need alternate location for family.", category: "shelter", priority: "high", status: "in_progress", assignedVolunteerId: FAKE_VOLUNTEERS[0] },
  { requesterId: FAKE_CITIZENS[2], location: DISTRICTS.barguna, description: "Cyclone shelter route blocked by fallen trees, need alternate path guidance.", category: "rescue", priority: "critical", status: "pending", assignedVolunteerId: null },
  { requesterId: FAKE_CITIZENS[3], location: DISTRICTS.patuakhali, description: "Child with high fever, nearest clinic flooded.", category: "medical", priority: "high", status: "assigned", assignedVolunteerId: FAKE_VOLUNTEERS[1] },
  { requesterId: FAKE_CITIZENS[4], location: DISTRICTS.chattogram, description: "Requested update on relief distribution schedule.", category: "other", priority: "low", status: "resolved", assignedVolunteerId: FAKE_VOLUNTEERS[2] },
  { requesterId: FAKE_CITIZENS[0], location: DISTRICTS.feni, description: "Community kitchen needs rice and lentil supplies restocked.", category: "food", priority: "medium", status: "in_progress", assignedVolunteerId: FAKE_VOLUNTEERS[2] },
];

async function seed() {
  const db = await connectToDatabase();

  await db.collection("shelters").deleteMany({});
  const shelterInsert = await db.collection("shelters").insertMany(
    shelters.map((s) => ({ ...s, createdAt: new Date(), updatedAt: new Date() }))
  );
  const shelterIds = Object.values(shelterInsert.insertedIds);

  await db.collection("risk_zones").deleteMany({});
  await db.collection("risk_zones").insertMany(
    riskZoneInputs.map((zone) => {
      const { riskScore, riskLevel } = computeRiskScore(zone.inputs);
      const [lng, lat] = DISTRICTS[districtKeyByRegion[zone.region]];
      return {
        region: zone.region,
        hazardType: zone.hazardType,
        geometry: { type: "Polygon" as const, coordinates: squarePolygon(lng, lat) },
        inputs: zone.inputs,
        riskScore,
        riskLevel,
        lastUpdated: new Date(),
      };
    })
  );

  await db.collection("resources").deleteMany({});
  await db.collection("resources").insertMany([
    { shelterId: shelterIds[0], type: "food", quantity: 200, unit: "kg", lastRestocked: new Date() },
    { shelterId: shelterIds[0], type: "water", quantity: 500, unit: "liters", lastRestocked: new Date() },
    { shelterId: shelterIds[0], type: "medicine", quantity: 50, unit: "packs", lastRestocked: new Date() },
    { shelterId: shelterIds[2], type: "food", quantity: 15, unit: "kg", lastRestocked: new Date() },
    { shelterId: shelterIds[3], type: "food", quantity: 180, unit: "kg", lastRestocked: new Date() },
    { shelterId: shelterIds[3], type: "blankets", quantity: 90, unit: "pieces", lastRestocked: new Date() },
    { shelterId: shelterIds[5], type: "water", quantity: 900, unit: "liters", lastRestocked: new Date() },
    { shelterId: shelterIds[5], type: "medicine", quantity: 120, unit: "packs", lastRestocked: new Date() },
    { shelterId: shelterIds[6], type: "water", quantity: 800, unit: "liters", lastRestocked: new Date() },
    { shelterId: shelterIds[6], type: "blankets", quantity: 40, unit: "pieces", lastRestocked: new Date() },
  ]);

  await db.collection("relief_requests").deleteMany({});
  await db.collection("relief_requests").insertMany(
    reliefRequests.map((r) => ({
      requesterId: r.requesterId,
      location: { type: "Point" as const, coordinates: r.location as [number, number] },
      description: r.description,
      category: r.category,
      priority: r.priority,
      status: r.status,
      assignedVolunteerId: r.assignedVolunteerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );

  await db.collection("shelters").createIndex({ location: "2dsphere" });
  await db.collection("risk_zones").createIndex({ geometry: "2dsphere" });
  await db.collection("relief_requests").createIndex({ location: "2dsphere" });
  await db.collection("relief_requests").createIndex({ requesterId: 1 });
  await db.collection("resources").createIndex({ shelterId: 1 });

  console.log(
    `[seed] ${shelters.length} shelters, ${riskZoneInputs.length} risk zones, 10 resource records, ${reliefRequests.length} relief requests, indexes created`
  );
  await closeDatabase();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});