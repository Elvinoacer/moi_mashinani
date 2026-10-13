import { CATEGORIES } from './categories';
import type { BusinessHours } from './types';
export type CatalogSuggestion = {name:string;unit?:string};
export type EnrollmentTemplate = {category:string;title:string;items:CatalogSuggestion[];modes:('at_shop'|'comes_to_you'|'delivery'|'online')[]};
const RAW:Record<string,string> = {
  "food-cafes": "Chapati|Beans|Rice and beans|Ugali and sukuma wiki|Chips|Pilau|Samosa|Mandazi|Smokie|Boiled eggs|Tea|Coffee|Soda|Bottled water|Githeri",
  "cakes-bakes": "Birthday cake|Cupcakes|Cake slices|Mini cakes|Cookies|Doughnuts|Muffins|Scones|Bread|Brownies|Cinnamon rolls|Custom cake orders",
  "restaurants-eateries": "Ugali and beef|Ugali and sukuma wiki|Rice and beans|Chapati and beans|Pilau|Githeri|Chips masala|Chicken and chips|Omena|Mukimo|Matumbo|Tea|Soda|Fresh juice",
  "street-food-snacks": "Smokie pasua|Boiled egg pasua|Samosa|Mandazi|Bhajia|Chips|Mutura|Roasted maize|Sausage|Viazi karai|Popcorn|Chapati|Fruit cups",
  "tea-coffee": "Tea with milk|Black tea|Ginger tea|Coffee|Hot chocolate|Mandazi|Chapati|Toast|Scones|Porridge|Scrambled eggs|Breakfast combo",
  "juice-smoothies": "Mango juice|Passion juice|Orange juice|Watermelon juice|Mixed fruit juice|Avocado smoothie|Banana smoothie|Fruit salad|Milkshake|Soda|Bottled water|Ice cream",
  "meal-delivery-catering": "Chapati and beans delivery|Pilau delivery|Rice and beef|Ugali meal|Weekly meal plan|Office lunch|Hostel breakfast|Event catering|Packed snacks|Party platters",
  "gas-groceries": "6 kg LPG refill|13 kg LPG refill|Cooking oil|Maize flour|Sugar|Rice|Beans|Eggs|Milk|Tomatoes|Onions|Sukuma wiki|Water|Bread",
  "shops-supermarkets": "Bread|Milk|Eggs|Rice|Beans|Cooking oil|Sugar|Salt|Flour|Soap|Toothpaste|Sanitary pads|Bottled water|Soda|Biscuits|Tissue paper",
  "fresh-produce": "Tomatoes|Onions|Sukuma wiki|Spinach|Cabbage|Potatoes|Carrots|Bananas|Avocados|Oranges|Mangoes|Watermelon|Fresh herbs|Green pepper",
  "butcheries-fish": "Beef per kg|Goat meat per kg|Chicken|Tilapia|Omena|Sausages|Minced meat|Pork per kg|Eggs|Fish fillets",
  "milk-dairy": "Fresh milk|Mala|Yoghurt|Flavoured yoghurt|Cheese|Butter|Ice cream|Milkshake|Dairy delivery",
  "cooking-gas": "6 kg gas refill|13 kg gas refill|New 6 kg cylinder|New 13 kg cylinder|Gas regulator|Gas burner|Gas pipe|Cylinder exchange|Hostel delivery",
  "water-delivery": "20 litre water refill|10 litre water refill|Bottled water 500 ml|Bottled water 1 litre|Bottled water 5 litre|Water dispenser|Hostel water delivery",
  "household-essentials": "Laundry detergent|Dishwashing liquid|Bar soap|Toilet cleaner|Tissue paper|Toothpaste|Shampoo|Sanitary pads|Hand wash|Disinfectant|Floor cleaner",
  "hostels-rooms": "Single room|Bedsitter|Shared room|One bedroom|Room viewing|Hostel booking inquiry|Water access|Wi-Fi availability|Security details",
  "rental-agents": "Bedsitter search|Single room search|Shared room matching|Property viewing|Vacancy updates|Caretaker contact|Room relocation help",
  "furniture-bedding": "Mattress|Pillow|Duvet|Bedsheet|Bed frame|Study table|Office chair|Curtains|Blanket|Storage shelf",
  "kitchen-homeware": "Electric kettle|Sufuria|Frying pan|Plate|Cup|Cooking spoon|Thermos|Gas burner|Rice cooker|Blender|Water flask",
  "moving-storage": "Hostel relocation|Furniture moving|Luggage storage|Packing help|Loading and unloading|Small parcel transport",
  "tailoring-fashion": "Trouser hemming|Dress alteration|Suit adjustment|Zip replacement|Uniform stitching|Curtain sewing|Custom dress|Button replacement|Clothing repair",
  "mitumba-thrift": "Jeans|Sweatshirts|Hoodies|T-shirts|Jackets|Dresses|Shirts|Sweaters|Sneakers|Track pants|Handbags|Bags|Shorts|Skirts",
  "clothing-boutiques": "Jeans|Trousers|Hoodies|Sweaters|T-shirts|Dresses|Shirts|Blazers|Jackets|Track suits|Skirts|Shorts|Handbags|Belts|Caps",
  "shoes-footwear": "Sneakers|Official shoes|Sandals|Slippers|Canvas shoes|Boots|Heels|Sports shoes|Crocs|Shoe laces|Shoe polish",
  "bags-accessories": "Backpacks|Handbags|Laptop bags|Wallets|Belts|Watches|Necklaces|Earrings|Bracelets|Caps|Sunglasses|Travel bags",
  "shoe-repair": "Sole replacement|Shoe stitching|Shoe cleaning|Sneaker deep clean|Shoe polish|Heel repair|Zip repair|Shoe restoration",
  "hair-beauty-kinyozi": "Men's haircut|Fade haircut|Beard trim|Knotless braids|Box braids|Dreadlock retwist|Wash and blow-dry|Wig installation|Hair treatment|Cornrows|Pedicure|Manicure",
  "nails-makeup": "Manicure|Pedicure|Gel polish|Acrylic nails|Lash installation|Eyebrow shaping|Makeup|Bridal makeup|Nail art|Nail refill",
  "cosmetics-skincare": "Body lotion|Face wash|Moisturizer|Sunscreen|Hair oil|Shampoo|Conditioner|Perfume|Lip gloss|Braiding hair|Wig care",
  "spa-massage": "Relaxation massage|Back massage|Facial treatment|Foot massage|Body scrub|Steam treatment|Skin consultation",
  "pharmacy-health": "Pharmacist consultation|Blood pressure check|Blood glucose check|Pregnancy test|First aid supplies|Thermometer|Oral rehydration salts|Wound dressings|Prescription review|OTC medicine enquiry|Health products",
  "clinics-dental": "General consultation|Blood pressure check|Lab testing|Dental consultation|Dental cleaning|Dressing and wound care|Family planning consultation|Health screening",
  "optical-eyecare": "Eye examination|Optical consultation|Prescription frames|Lens fitting|Sunglasses|Frame repair|Contact lens consultation",
  "counselling-wellbeing": "One-on-one counselling|Student counselling|Stress support|Career counselling|Relationship counselling|Group session|Wellbeing consultation",
  "phone-laptop-repair": "Phone screen replacement|Battery replacement|Charging port repair|Software installation|Laptop diagnostics|Keyboard replacement|Laptop cleaning|Data recovery|Phone unlocking|System troubleshooting",
  "wifi-tech-gadgets": "Wi-Fi router|Internet subscription|USB cable|Fast charger|Earphones|Flash drive|Power bank|Headphones|Wireless earbuds|Phone case|Screen protector",
  "electronics-accessories": "Smartphone|Refurbished phone|Laptop|Phone case|Fast charger|Power bank|USB flash drive|Earphones|Computer mouse|Keyboard|Screen protector",
  "internet-installation": "Wi-Fi installation|Router configuration|Monthly internet plan|Fiber setup|Network troubleshooting|Wi-Fi password reset|Range extender setup",
  "software-design": "Business website|Personal portfolio|Logo design|Social media poster|App development|IT support|Domain setup|Website maintenance|Video editing",
  "printing-cyber": "Black-and-white printing|Colour printing|Photocopying|Scanning|Lamination|Spiral binding|Thesis binding|Passport photos|CV typing|HELB assistance|KRA PIN services",
  "tutors-academics": "Mathematics tutoring|Programming tutoring|Revision classes|Exam preparation|Lab practical support|Past paper discussion|One-on-one coaching",
  "stationery-books": "Exercise book|Ballpoint pens|A4 printing paper|Highlighter|Textbook|Graph book|Scientific calculator|File folder|Sticky notes|Ruler",
  "driving-skills": "Driving lessons|Driving test preparation|Computer packages|Typing classes|Digital skills training|Practical classes|Refresher lesson",
  "career-services": "CV review|Cover letter writing|Portfolio website|Interview preparation|LinkedIn profile review|Job application support|Internship guidance",
  "boda-transport": "Campus ride|Hostel pickup|Parcel delivery|Kesses town ride|Errand transport|Luggage transfer",
  "taxis-shuttles": "Town taxi ride|Airport transfer|Group shuttle|Campus pickup|Event transport|Scheduled booking",
  "courier-delivery": "Parcel pickup|Food delivery|Shopping errands|Document delivery|Hostel doorstep delivery|Town errand|Express courier",
  "vehicle-repair": "Puncture repair|Motorcycle service|Oil change|Brake repair|Chain adjustment|Battery check|Spare parts",
  "car-wash": "Motorbike wash|Car exterior wash|Interior cleaning|Full car wash|Vehicle detailing|Seat cleaning",
  "mpesa-banking": "M-Pesa deposit|M-Pesa withdrawal|Bank agent deposit|Bank agent withdrawal|Bill payment assistance|Airtime",
  "professional-services": "Business registration help|KRA tax filing|Bookkeeping|Accounting consultation|Business permits|Legal consultation|Document preparation",
  "photography-video": "Graduation photo shoot|Studio portraits|Birthday shoot|Event photography|Video coverage|Photo editing|Passport photos|Product photography",
  "gyms-fitness": "Daily gym pass|Monthly gym membership|Personal training|Aerobics class|Weight training|Fitness assessment|Group workouts",
  "gaming-entertainment": "PlayStation session|FIFA gaming|Pool table|Movie screening|Gaming tournament|Private gaming session",
  "sports-outdoors": "Football jersey|Gym gloves|Sports shoes|Ball rental|Pitch booking|Fitness equipment|Outdoor games",
  "bars-lounges": "Table reservation|Private event space|Live music entry|Snacks|Soft drinks|Game night|Event booking",
  "events-djs": "DJ booking|Sound system hire|Event MC|Tent hire|Chairs hire|Decor setup|Lighting hire|Event photography",
  "gifts-flowers": "Flower bouquet|Birthday gift|Balloons|Gift hamper|Greeting card|Surprise delivery|Chocolate gift",
  "travel-accommodation": "Single guest room|Double guest room|Short stay|Group accommodation|Tour booking|Local transport",
  "laundry-mama-fua": "Clothes wash and fold|Hostel laundry pickup|Duvet cleaning|Blanket washing|Ironing|Dry cleaning|Sneaker cleaning|Bedsheet washing|Curtain washing",
  "cleaning-services": "Hostel room cleaning|Deep cleaning|Office cleaning|Mattress cleaning|Sofa cleaning|Carpet wash|Move-out cleaning|Pest control enquiry",
  "plumbing-electrical": "Leaking tap repair|Socket repair|Light installation|Plumbing inspection|Blocked drain|Shower repair|Electrical fault check|Wiring repair",
  "carpentry-welding": "Door repair|Shelf installation|Table repair|Chair repair|Furniture assembly|Welding repair|Metal gate repair",
  "appliance-repair": "Kettle repair|Blender repair|Fridge diagnostics|Cooker repair|TV repair|Fan repair|Washing machine repair",
  "other-local-services": "Consultation|Service enquiry|Home visit|Custom order|Delivery|Appointment"
};
const DELIVERY=new Set(['meal-delivery-catering','courier-delivery','water-delivery','cooking-gas','laundry-mama-fua','gas-groceries','food-cafes','boda-transport']);
const MOBILE=new Set(['laundry-mama-fua','cleaning-services','plumbing-electrical','courier-delivery','software-design','photography-video']);
export function enrollmentTemplate(category:string):EnrollmentTemplate {
  const found=CATEGORIES.find(c=>c.slug===category);
  const titles=RAW[category]?.split('|') || ['Service enquiry','Custom order'];
  const modes:EnrollmentTemplate['modes'] = MOBILE.has(category) ? ['comes_to_you'] : DELIVERY.has(category) ? ['at_shop','delivery'] : ['at_shop'];
  return {category,title:found?.name || 'Local business',items:titles.map(name=>({name})),modes};
}
export function templateSuggestions(category:string,search=''):CatalogSuggestion[] {
  const items=enrollmentTemplate(category).items;
  return search.trim() ? items.filter(item=>item.name.toLowerCase().includes(search.trim().toLowerCase())) : items;
}
function variant(seed:string,choice:number) {
  let hash=0;for(let i=0;i<seed.length;i++)hash=(Math.imul(31,hash)+seed.charCodeAt(i))|0;
  return Math.abs(hash)%choice;
}
/** Suggestions are editable starting points, never claims of actual stock, licensing or service quality. */
export function suggestedEnrollmentCopy(category:string,name:string,zone:string,products:string[],variation=0) {
  const title=enrollmentTemplate(category).title.toLowerCase();
  const shop=name.trim() || 'This business';
  const place=zone === 'all' ? 'around Moi University' : 'in '+(zone.replaceAll('-',' '));
  const listed=products.slice(0,3).join(', ');
  const subject=listed || title;
  const taglines=[
    `${subject} · available from ${shop}`,
    `${shop} — ${subject} near campus`,
    `Find ${subject} with ${shop}`,
    `${shop} | ${title} around Moi University`,
  ];
  const descriptions=[
    `${shop} is a local ${title} business ${place}. Explore ${subject}, view available services and reach the owner directly to confirm prices and availability.`,
    `Looking for ${title} ${place}? ${shop} has a profile where you can ask about ${subject}, contact the business and arrange the next step directly.`,
    `Discover ${shop}, a ${title} option ${place}. Check the listed ${subject} and contact the business for current details, pricing and arrangements.`,
    `${shop} helps customers discover ${title} ${place}. Browse listed ${subject}, then call or message to confirm what is currently offered.`,
  ];
  const i=variant(`${shop}|${category}|${zone}|${variation}`,taglines.length);
  return {tagline:taglines[i].slice(0,160),description:descriptions[i]};
}
export const ENROLLMENT_DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const;
export function hoursPreset(kind:'standard'|'everyday'|'late'|'appointment'):BusinessHours {
  const hours=Object.fromEntries(ENROLLMENT_DAYS.map(day=>[day,{open:'08:00',close:'18:00',closed:day==='Sunday'}])) as BusinessHours;
  if(kind==='everyday') ENROLLMENT_DAYS.forEach(day=>{hours[day]={open:'08:00',close:'20:00',closed:false};});
  if(kind==='late') ENROLLMENT_DAYS.forEach(day=>{hours[day]={open:'10:00',close:'22:00',closed:false};});
  if(kind==='appointment') ENROLLMENT_DAYS.forEach(day=>{hours[day]={open:'09:00',close:'17:00',closed:false,appointmentOnly:true};});
  return hours;
}
