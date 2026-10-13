import type { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[90dvh]">
        <div className="mx-auto w-full max-w-xl overflow-y-auto px-safe pb-safe pt-4">
          <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">{title}</DrawerDescription>
          <div className="mt-5 pb-4">{children}</div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
