import ConsentPendingNotice from '../components/ConsentPendingNotice.jsx';

// The standalone waiting page. SAFE-3 narrowed the consent gate to /miqte and /bisedat,
// so nothing redirects here automatically any more — a consent-pending minor lands in
// the app normally and can use games, lessons, the roadmap and their profile right away.
//
// The route stays reachable on purpose: a parent's link can expire, and the child (or
// the parent on a shared device) may navigate here directly to resend it. Logging out is
// offered here because this page is a destination in its own right, unlike the inline
// gate where the rest of the app is still available.
const PendingConsent = () => <ConsentPendingNotice showLogout />;

export default PendingConsent;
