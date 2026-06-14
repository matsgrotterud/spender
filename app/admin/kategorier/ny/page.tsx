import { requireUser } from "@/lib/auth/session";
import { CategoryEditor } from "@/features/admin/category-editor";

export default async function NewCategoryPage() {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);
  return <CategoryEditor />;
}
