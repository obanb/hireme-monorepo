import Link from "next/link";

type Endpoint = {
  method: "GET" | "POST";
  path: string;
  description: string;
  auth?: string;
};

const restEndpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/health",
    description: "Checks gateway status and lists connected subgraphs."
  },
  {
    method: "GET",
    path: "/hello",
    description: "Simple JSON example returning hello message."
  }
];

const graphQLEndpoints = [
  {
    name: "Federated Gateway",
    url: "http://localhost:8080/graphql",
    notes: "Apollo Gateway composing all subgraphs."
  },
  {
    name: "Hotel Subgraph",
    url: "http://localhost:4001/graphql",
    notes: "Standalone federated service exposing hotel data."
  }
];

const sampleQuery = `query FeaturedHotels($limit: Int!) {
  featuredHotels(limit: $limit) {
    id
    name
    city
    rating
  }
}`;

const sampleCurl = `curl --request POST \\
  --url http://localhost:8080/graphql \\
  --header "Content-Type: application/json" \\
  --data '{\\"query\\":\\"query FeaturedHotels($limit: Int!){ featuredHotels(limit: $limit){ id name city rating }}\\",\\"variables\\":{\\"limit\\":2}}'`;

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="space-y-4 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-500">API Documentation</p>
          <h1 className="text-4xl font-bold text-slate-900">Hotel CMS Platform APIs</h1>
          <p className="text-slate-600 max-w-3xl mx-auto">
            Reference for the federated GraphQL gateway and REST utilities exposed by the platform. Use these docs to explore
            health checks, sample requests, and GraphQL subgraphs.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow border border-slate-100 p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Gateway Base URL</h2>
              <p className="text-slate-500">Set FELIX_API_URL or use default localhost endpoint.</p>
            </div>
            <code className="px-4 py-2 rounded-full bg-slate-900 text-slate-50 text-sm">
              http://localhost:8080
            </code>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {restEndpoints.map((endpoint) => (
              <div key={endpoint.path} className="rounded-xl border border-slate-100 p-5 bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`text-xs font-bold tracking-wide px-2 py-1 rounded ${
                      endpoint.method === "GET" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="font-semibold text-slate-900">{endpoint.path}</code>
                </div>
                <p className="text-sm text-slate-600">{endpoint.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow border border-slate-100 p-8 space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">GraphQL Endpoints</h2>
          <div className="space-y-4">
            {graphQLEndpoints.map((endpoint) => (
              <div
                key={endpoint.url}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-slate-100 rounded-xl p-4"
              >
                <div>
                  <p className="text-sm uppercase tracking-wide text-blue-500">{endpoint.name}</p>
                  <p className="text-sm text-slate-500">{endpoint.notes}</p>
                </div>
                <Link
                  href={endpoint.url}
                  target="_blank"
                  className="font-mono text-sm text-slate-50 bg-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
                >
                  {endpoint.url}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow border border-slate-100 p-8 space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">Sample GraphQL Request</h2>
          <p className="text-slate-600 text-sm">
            Execute against the gateway or directly against the hotel subgraph using any GraphQL client (Apollo Studio, Insomnia,
            Postman, curl).
          </p>
          <div className="rounded-xl bg-slate-900 text-slate-50 p-6 font-mono text-sm overflow-auto">
            {sampleQuery}
          </div>
          <pre className="rounded-xl bg-slate-50 border border-dashed border-slate-200 p-4 text-sm text-slate-700 overflow-auto">
            <code>{sampleCurl}</code>
          </pre>
        </section>

        <section className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-8 text-white space-y-4">
          <h2 className="text-2xl font-semibold">Next Steps</h2>
          <p className="text-sm text-indigo-100">
            Add authentication headers, extend subgraphs with additional entities, or document custom REST utilities here.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/hotel-cms"
              className="px-5 py-2 rounded-lg bg-white/10 border border-white/20 text-sm font-medium hover:bg-white/20 transition"
            >
              Back to Dashboard
            </Link>
            <a
              href="https://www.apollographql.com/docs/federation/"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2 rounded-lg bg-white text-indigo-600 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Learn Federation
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

