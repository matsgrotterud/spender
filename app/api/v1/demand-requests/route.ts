import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/api-key";
import { db } from "@/lib/db";

const MAX_PAGE_SIZE = 50;

/**
 * Paginated list of ACTIVE demand requests. Returns the privacy-safe public
 * snapshot only – never private consumer data. Intentionally not
 * scraping-friendly: requires an API key, strict page size, no bulk export.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, "read");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(url.searchParams.get("page_size") ?? "20", 10) || 20),
  );
  const categorySlug = url.searchParams.get("category") ?? undefined;
  const region = url.searchParams.get("region") ?? undefined;

  const where = {
    status: "ACTIVE" as const,
    deletedAt: null,
    anonymizedAt: null,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(region ? { region: { contains: region, mode: "insensitive" as const } } : {}),
  };

  const [requests, total] = await Promise.all([
    db.demandRequest.findMany({
      where,
      include: {
        category: { select: { slug: true, name: true } },
        consumer: { select: { consumerProfile: { select: { displayAlias: true } } } },
        offers: {
          where: { organizationId: auth.ctx.organization.id },
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.demandRequest.count({ where }),
  ]);

  return NextResponse.json({
    data: requests.map((req) => ({
      id: req.id,
      title: req.title,
      category: req.category.slug,
      categoryName: req.category.name,
      consumerAlias: req.consumer.consumerProfile?.displayAlias ?? "Forbruker",
      region: req.region,
      priceZone: req.priceZone,
      publicSnapshot: req.publicSnapshotJson,
      expiresAt: req.expiresAt,
      createdAt: req.createdAt,
      ourOffer: req.offers[0] ? { id: req.offers[0].id, status: req.offers[0].status } : null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
