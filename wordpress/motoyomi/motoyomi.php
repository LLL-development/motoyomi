<?php
/**
 * Plugin Name: Motoyomi Internal Links
 * Description: Local Japanese internal-link and related-article suggestions. No external services.
 * Version: 0.1.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Author: LLL Inc.
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: motoyomi
 * Domain Path: /languages
 *
 * @package Motoyomi
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; }
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/includes/class-motoyomi-il-engine.php';
require_once __DIR__ . '/includes/class-motoyomi-il-plugin.php';
Motoyomi_IL_Plugin::boot();
register_activation_hook( __FILE__, array( 'Motoyomi_IL_Plugin', 'activate' ) );
register_deactivation_hook(
	__FILE__,
	function () {
		wp_clear_scheduled_hook( 'motoyomi_il_batch' );
	}
);
