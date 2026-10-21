import type { Metadata } from "next";
export const metadata: Metadata = {title:"99 Hudson St. Apartments – Maintenance",description:"ALED Technologies maintenance scheduling for 99 Hudson residents."};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
