import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useBookingCart } from '../../context/BookingCartContext.jsx';
import EmergencyPillSlider from './EmergencyPillSlider.jsx';
import MonitoringStatus from './MonitoringStatus.jsx';

export default function PatientDashboardSubHeader({ addressControl, onEmergencyActivate }) {
  const { itemCount } = useBookingCart();

  return (
    <div className="dashboard-subheader" aria-label="Dashboard quick actions">
      <div className="dashboard-subheader-row">
        <EmergencyPillSlider onActivate={onEmergencyActivate} />

        <MonitoringStatus compactOnMobile />

        <div className="dashboard-subheader-address min-w-0 flex-1">{addressControl}</div>

        <Link to="/dashboard/cart" className="dashboard-subheader-cart shrink-0" title="View cart">
          <ShoppingCart className="w-4 h-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Cart</span>
          {itemCount > 0 && (
            <span className="dashboard-subheader-cart-badge" aria-label={`${itemCount} items in cart`}>
              {itemCount > 9 ? '9+' : itemCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
