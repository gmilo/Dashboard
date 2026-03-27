import { PageShell } from "@/components/page-shell";
import { ProductDetails } from "@/components/product-details.client";

export default function DrinkProductPage({ params }: { params: { id: string } }) {
  return (
    <PageShell title="Product">
      <ProductDetails id={params.id} />
    </PageShell>
  );
}

