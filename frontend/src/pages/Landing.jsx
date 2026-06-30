import GuestOnly from '../components/GuestOnly.jsx';
import HomePage from '../components/home/HomePage.jsx';

export default function Landing() {
  return (
    <GuestOnly>
      <HomePage />
    </GuestOnly>
  );
}
