/**
 * RadialSOSMenu — now opens ControlCenter instead of radial arc
 */

import React from 'react';
import { useQuickActions } from '../../context/QuickActionsContext';
import ControlCenter from './ControlCenter';
import { navigateToHome } from '../../services/navigationService';

export default function RadialSOSMenu() {
    const { fabSheetVisible, setFabSheetVisible, triggerFABAction } = useQuickActions();

    const closeMenu = () => setFabSheetVisible(false);

    const handleDiaper = () => {
        triggerFABAction('diaper');
        navigateToHome();
    };

    const handleNightLight = () => {
        triggerFABAction('nightLight');
        navigateToHome();
    };

    const handleQuickReminder = () => {
        triggerFABAction('quickReminder');
        navigateToHome();
    };

    return (
        <ControlCenter
            visible={fabSheetVisible}
            onClose={closeMenu}
            onDiaper={handleDiaper}
            onNightLight={handleNightLight}
            onQuickReminder={handleQuickReminder}
        />
    );
}
