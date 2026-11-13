import { demoRateProvider, isRateRequest } from "../server/rates";

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json({ error: "Use POST to request a quote." }, {
        status: 405,
        headers: { Allow: "POST" },
      });
    }

    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
    }

    if (!isRateRequest(input)) {
      return Response.json({
        error: "Enter both cities, a supported unit and weight (up to 10,000), and dimensions up to 500 cm if provided.",
      }, { status: 400 });
    }

    return Response.json(await demoRateProvider.quote(input));
  },
};
