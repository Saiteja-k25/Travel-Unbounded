import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";

// Layout for the public site: home, about and contact.
//
// The navigation, footer and Sarathi live here rather than in the root layout
// so the admin dashboard does not inherit them. Previously they did, which put
// a 600px marketing footer underneath the enquiries table.
//
// "(site)" is a route group: the parentheses mean the folder does not appear in
// any URL, so these pages are still served at /, /about and /contact.
export default function SiteLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <ChatWidget />
    </>
  );
}
