type FeaturedHotel = {
  id: string;
  name: string;
  city: string;
  rating: number;
  roomCount: number;
};

async function fetchFeaturedHotels(): Promise<FeaturedHotel[]> {
  const endpoint = process.env.FEDERATED_BACKEND_URL ?? "http://localhost:4001/graphql";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query FeaturedHotels($limit: Int!) {
          featuredHotels(limit: $limit) {
            id
            name
            city
            rating
            roomCount
          }
        }
      `,
      variables: { limit: 3 }
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Backend responded with ${response.status}`);
  }

  const body = await response.json();
  if (body.errors) {
    throw new Error(body.errors.map((err: { message: string }) => err.message).join(", "));
  }

  return body.data?.featuredHotels ?? [];
}

export default async function LiveRates() {
  try {
    const featuredHotels = await fetchFeaturedHotels();

    if (!featuredHotels.length) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
          No featured hotels available yet. Start the federated backend to see live data.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {featuredHotels.map((hotel) => (
          <div key={hotel.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-wide text-blue-500 mb-2">Federated Hotel</p>
            <h3 className="text-xl font-semibold text-slate-800">{hotel.name}</h3>
            <p className="text-sm text-slate-500 mb-4">{hotel.city}</p>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Rating: <strong>{hotel.rating.toFixed(1)}</strong></span>
              <span>Rooms: <strong>{hotel.roomCount}</strong></span>
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold mb-2">Unable to reach the federated backend.</p>
        <p className="text-sm">
          {error instanceof Error ? error.message : "Unknown error occurred."} Ensure the service is running on
          <code className="ml-1 font-mono text-xs">http://localhost:4001/graphql</code> or set <code className="font-mono text-xs">FEDERATED_BACKEND_URL</code>.
        </p>
      </div>
    );
  }
}

