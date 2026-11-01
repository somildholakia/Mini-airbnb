const mongoose = require("mongoose");
const Listing = require("../models/listing");
const hotels = require("../data/curated-hotels.json");

const coordinates = {
  "Udaipur":[73.7125,24.5854],"Jaipur":[75.7873,26.9124],"Agra":[78.0081,27.1767],
  "New Delhi":[77.209,28.6139],"Hyderabad":[78.4867,17.385],"Mumbai":[72.8777,19.076],
  "Goa":[73.8278,15.2993],"Bengaluru":[77.5946,12.9716],"Kerala":[76.2711,10.8505],
  "Himachal Pradesh":[77.1734,31.1048],"Ranthambore":[76.5026,26.0173],"Jaisalmer":[70.9024,26.9157],
  "Hampi":[76.4600,15.335],"Tokyo":[139.6503,35.6762],"Kyoto":[135.7681,35.0116],
  "Osaka":[135.5023,34.6937],"Nikko":[139.6982,36.7199],"Bangkok":[100.5018,13.7563],
  "Phuket":[98.3923,7.8804],"Krabi":[98.9063,8.0863],"Koh Samui":[100.0136,9.512],"Singapore":[103.8198,1.3521],
  "Hong Kong":[114.1694,22.3193],"Bali":[115.1889,-8.4095],"Lombok":[116.351, -8.565],
  "Komodo":[119.489, -8.55],"Maldives":[73.2207,3.2028],"Baa Atoll":[72.9667,5.1333],
  "Haa Dhaalu Atoll":[72.95,6.6],"Hanoi":[105.8342,21.0278],"Hoi An":[108.338,15.8801],
  "Nha Trang":[109.1967,12.2388],"Da Nang":[108.2022,16.0544],"Ho Chi Minh City":[106.6297,10.8231],
  "Phu Quoc":[103.984,10.2899],"Galle":[80.221,6.0535],"Colombo":[79.8612,6.9271],
  "Dubai":[55.2708,25.2048],"Abu Dhabi":[54.3773,24.4539],"Oman":[57.5,21.0],
  "Doha":[51.531,25.285],"AlUla":[37.923,26.608],"Cape Town":[18.4241,-33.9249],
  "Kruger National Park":[31.5,-24.0],"Masai Mara":[35.2,-1.5],"Serengeti":[34.8333,-2.3333],
  "Zanzibar":[39.2,-6.16],"Marrakech":[-7.9811,31.6295],"London":[-0.1276,51.5072],
  "Paris":[2.3522,48.8566],"Rome":[12.4964,41.9028],"Venice":[12.3155,45.4408],
  "Florence":[11.2558,43.7696],"Milan":[9.19,45.4642],"Zurich":[8.5417,47.3769],
  "Lausanne":[6.6323,46.5197],"Andermatt":[8.5932,46.635],"St. Moritz":[9.8355,46.4908],
  "Gstaad":[7.2861,46.4722],"Zermatt":[7.7491,46.0207],"Barcelona":[2.1734,41.3851],
  "Tenerife":[-16.6291,28.2916],"Marbella":[-4.8856,36.5101],"Seville":[-5.9845,37.3891],
  "Lisbon":[-9.1393,38.7223],"Madeira":[-16.9241,32.6669],"Santorini":[25.4615,36.3932],
  "Costa Navarino":[21.7,36.95],"Athens":[23.7275,37.9838],"Vienna":[16.3738,48.2082],
  "Amsterdam":[4.9041,52.3676],"Berlin":[13.405,52.52],"Munich":[11.582,48.1351],
  "Copenhagen":[12.5683,55.6761],"Oslo":[10.7522,59.9139],"Swedish Lapland":[20.0,67.5],
  "New York":[-74.006,40.7128],"Beverly Hills":[-118.4004,34.0736],"Los Angeles":[-118.2437,34.0522],
  "San Francisco":[-122.4194,37.7749],"Miami Beach":[-80.130,25.790],"Las Vegas":[-115.1398,36.1699],
  "Hawaii":[-155.5828,19.8968],"Napa Valley":[-122.2869,38.5025],"Chicago":[-87.6298,41.8781],
  "Boston":[-71.0589,42.3601],"Washington":[-77.0369,38.9072],"Aspen":[-106.8175,39.1911],
  "Jackson Hole":[-110.7624,43.4799],"Banff":[-115.5708,51.1784],"Toronto":[-79.3832,43.6532],
  "Montreal":[-73.5673,45.5017],"Fogo Island":[-55.4,49.7],"Mexico City":[-99.1332,19.4326],
  "San Miguel de Allende":[-100.743,20.914],"Punta Mita":[-105.52,20.77],"Los Cabos":[-109.9167,22.8905],
  "Riviera Maya":[-87.0,20.6],"Jamaica":[-77.2975,18.1096],"St. Lucia":[-60.9789,13.9094],
  "Turks and Caicos":[-72.2,21.7],"Anguilla":[-63.0686,18.2206],"Rio de Janeiro":[-43.1729,-22.9068],
  "São Paulo":[-46.6333,-23.5505],"Buenos Aires":[-58.3816,-34.6037],"Lima":[-77.0428,-12.0464],
  "Patagonia":[-73.0,-50.0],"Iguazu Falls":[-54.4367,-25.6953],"Sydney":[151.2093,-33.8688],
  "Melbourne":[144.9631,-37.8136],"Brisbane":[153.0251,-27.4698],"Queenstown":[168.6626,-45.0312],
  "Auckland":[174.7633,-36.8485],"Bora Bora":[-151.7415,-16.5004],"Fiji":[178.065,-17.7134],
  "Lake Como":[9.261,45.99],"Chocholá":[-89.82,20.75],"Porto Ercole":[11.2,42.4],
  "Riviera Nayarit":[-105.4,20.9],"Cabo San Lucas":[-109.9167,22.8905],"Witney":[-1.485,51.783],
  "Rovinj":[13.6387,45.0812],"Monte Carlo":[7.4246,43.7396],"Surfside":[-80.125,25.878],
  "Santa Barbara":[-119.6982,34.4208],"Kangaroo Island":[137.2,-35.8],"Auchterarder":[-3.7,56.3],
  "Lisciano Niccone":[12.15,43.25],"Modena":[10.9252,44.6471],"Portofino":[9.2095,44.303],
  "Zighy Bay":[56.25,25.95],"Langkawi":[99.8,6.35],"Cusco":[-71.9675,-13.5319],
  "Taupō":[176.078,-38.6857],"Stockholm":[18.0686,59.3293],"St. Jean":[-62.85,17.9],
  "Jawai":[73.2,25.0],"Ajabgarh":[76.55,27.15],"La Manzanilla":[-104.7,19.28],
  "Savelletri":[17.4,40.88],"Antibes":[7.1253,43.5804],"Canyon Point":[-111.41,37.1]
};

const imageSets = {
  "Urban luxury":[
    "photo-1542314831-068cd1dbfeeb","photo-1566073771259-6a8506099945",
    "photo-1564501049412-61c2a3083791","photo-1611892440504-42a792e24d32"
  ],
  "Resort":[
    "photo-1571896349842-33c89424de2d","photo-1540541338287-41700207dee6",
    "photo-1582719508461-905c673771fd","photo-1576013551627-0cc20b96c2a7"
  ],
  "Island resort":[
    "photo-1540541338287-41700207dee6","photo-1571896349842-33c89424de2d",
    "photo-1500375592092-40eb2168fd21"
  ],
  "Historic":[
    "photo-1519449556851-5720b33024e7","photo-1600210492486-724fe5c67fb0",
    "photo-1566073771259-6a8506099945"
  ],
  "Boutique":[
    "photo-1590490360182-c33d57733427","photo-1611892440504-42a792e24d32",
    "photo-1600607687939-ce8a6c25118c"
  ],
  "Safari":[
    "photo-1516026672322-bc52d61a55d5","photo-1472396961693-142e6e269027",
    "photo-1448375240586-882707db888b"
  ],
  "Nature retreat":[
    "photo-1470770841072-f978cf4d019e","photo-1449158743715-0a90ebb6d2d8",
    "photo-1470252649378-9c29740c9fa8"
  ],
  "Nature lodge":[
    "photo-1448375240586-882707db888b","photo-1500530855697-b586d89ba3ee",
    "photo-1470770841072-f978cf4d019e"
  ],
  "Wellness":[
    "photo-1540555700478-4be289fbecef","photo-1544161515-4ab6ce6db874"
  ],
  "Country house":[
    "photo-1510798831971-661eb04b3739","photo-1600607687939-ce8a6c25118c"
  ],
  "Heritage":[
    "photo-1519449556851-5720b33024e7","photo-1600210492486-724fe5c67fb0"
  ]
};
function stableHash(text) {
  let hash = 0;
  for (const character of text) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}
function imageUrl(hotel) {
  const options = imageSets[hotel.category] || imageSets["Urban luxury"];
  const photo = options[stableHash(hotel.slug) % options.length];
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1200&q=82`;
}
async function main() {
  if (!process.env.ATLASTDB_URL) throw new Error("ATLASTDB_URL is required");
  await mongoose.connect(process.env.ATLASTDB_URL);
  const operations = hotels.map((hotel, index) => {
    const coordinate = coordinates[hotel.city] || null;
    const first100 = index < 100;
    const doc = {
      slug: hotel.slug,
      title: hotel.name,
      description: `${hotel.name} is a notable stay in ${hotel.city}, ${hotel.country}. This WanderSite editorial profile helps travellers discover the property. Confirm current facilities, room types, rates and availability directly with the hotel before booking.`,
      image: { url: imageUrl(hotel), filename: "wandersite-editorial" },
      price: null,
      location: hotel.city,
      country: hotel.country,
      locationCoordinates: coordinate ? { type: "Point", coordinates: coordinate } : undefined,
      category: hotel.category,
      propertyType: "Hotel",
      isCurated: true,
      featured: index < 16,
      curationSource: first100 ? "The World's 50 Best Hotels 2025" : "WanderSite editorial selection",
      curationRank: first100 ? index + 1 : null,
      hotelSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(hotel.name + " " + hotel.city + " " + hotel.country + " official hotel website rates")}`,
      imageDisclaimer: "Editorial destination imagery; not represented as a verified photograph of this exact property."
    };
    return {
      updateOne: {
        filter: { slug: hotel.slug },
        update: { $setOnInsert: doc },
        upsert: true
      }
    };
  });
  try {
    const result = await Listing.bulkWrite(operations, { ordered: false });
    console.log(JSON.stringify({
      sourceRecords: hotels.length,
      inserted: result.upsertedCount,
      alreadyPresent: result.matchedCount
    }));
  } finally {
    await mongoose.disconnect();
  }
}
main().catch(async (error) => {
  console.error("Hotel catalog seed failed:", error.name || "UnknownError");
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
