// Static destination data. The assignment states destination and pricing data
// can be dummy/hardcoded, so there is deliberately no database behind this.
// Images are hotlinked from Unsplash (free to use); the host is allowlisted in
// next.config.mjs so next/image can optimise them.

export const destinations = [
  {
    id: 1,
    name: "Kerala",
    country: "India",
    image:
      "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?auto=format&fit=crop&w=1200&q=70",
    imageAlt: "Traditional houseboat on the palm-lined Kerala backwaters",
    description:
      "Drift through the Alappuzha backwaters on a private houseboat, then wake to mist over the Munnar tea hills.",
    price: 25000,
    category: "india",
  },
  {
    id: 2,
    name: "Himachal Pradesh",
    country: "India",
    image:
      "https://images.unsplash.com/photo-1641310045101-fd176a42cd44?auto=format&fit=crop&w=1200&q=70",
    imageAlt: "Himalayan mountain range at sunset in Himachal Pradesh",
    description:
      "Deodar forests, apple orchards and old Raj-era hill towns, with the Dhauladhar range never out of sight.",
    price: 22000,
    category: "india",
  },
  {
    id: 3,
    name: "Ladakh",
    country: "India",
    image:
      "https://images.unsplash.com/photo-1619837374214-f5b9eb80876d?auto=format&fit=crop&w=1200&q=70",
    imageAlt: "Turquoise Indus and Zanskar rivers meeting at Sangam, Ladakh",
    description:
      "High-altitude desert, 400-year-old monasteries and the road to Pangong Tso, paced for proper acclimatisation.",
    price: 38000,
    category: "india",
  },
  {
    id: 4,
    name: "Andaman",
    country: "India",
    image:
      "https://images.unsplash.com/photo-1586359716568-3e1907e4cf9f?auto=format&fit=crop&w=1200&q=70",
    imageAlt: "Palm trees on a white sand beach in the Andaman Islands",
    description:
      "White sand, first-time dives off Havelock and quiet ferry hops to islands most itineraries skip.",
    price: 32000,
    category: "india",
  },
  {
    id: 5,
    name: "Goa",
    country: "India",
    image:
      "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=1200&q=70",
    imageAlt: "Colourful beach huts and palm trees on a Goan beach",
    description:
      "Portuguese-era quarters, spice plantations and the slower southern beaches, well away from the crowds.",
    price: 18000,
    category: "india",
  },
  {
    id: 6,
    name: "Kenya",
    country: "Kenya",
    image:
      "https://images.unsplash.com/photo-1559494487-a5bbc635ed2b?auto=format&fit=crop&w=1200&q=70",
    imageAlt: "Safari vehicle beside an antelope in the Masai Mara",
    description:
      "Dawn game drives in the Masai Mara for the Big Five, led by guides our Nairobi team has worked with for years.",
    price: 185000,
    category: "international",
  },
  {
    id: 7,
    name: "Vietnam",
    country: "Vietnam",
    image:
      "https://images.unsplash.com/photo-1625396836163-80c0d3d7eb86?auto=format&fit=crop&w=1200&q=70",
    imageAlt: "Boat sailing past limestone karsts in Ha Long Bay",
    description:
      "Sunset on Ha Long Bay, Hoi An's lantern-lit lanes and street food worth planning an entire day around.",
    price: 95000,
    category: "international",
  },
  {
    id: 8,
    name: "Tanzania",
    country: "Tanzania",
    image:
      "https://images.unsplash.com/photo-1564101160531-4838e8a5f4e7?auto=format&fit=crop&w=1200&q=70",
    imageAlt: "Herd of wildebeest crossing a river in the Serengeti",
    description:
      "The Serengeti migration timed to the river crossings, with the Ngorongoro Crater rim for the nights between.",
    price: 210000,
    category: "international",
  },
  {
    id: 9,
    name: "Iceland",
    country: "Iceland",
    image:
      "https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=1200&q=70",
    imageAlt: "Wide waterfall cascading over cliffs in Iceland",
    description:
      "Ring Road waterfalls, black sand coastline and clear winter nights kept free for the aurora.",
    price: 245000,
    category: "international",
  },
  {
    id: 10,
    name: "Sri Lanka",
    country: "Sri Lanka",
    image:
      "https://images.unsplash.com/photo-1544015759-237f87d55ef3?auto=format&fit=crop&w=1200&q=70",
    imageAlt: "Aerial view of green tea plantation fields in Sri Lanka",
    description:
      "The hill-country train to Ella, tea estates above Nuwara Eliya and leopard tracking in Yala.",
    price: 78000,
    category: "international",
  },
];

// Derived lists so pages don't repeat the same filter logic.
export const indiaDestinations = destinations.filter(
  (destination) => destination.category === "india"
);

export const internationalDestinations = destinations.filter(
  (destination) => destination.category === "international"
);
