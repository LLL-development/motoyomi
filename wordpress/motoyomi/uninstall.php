<?php
/**
 * Remove this site's local index and settings.
 *
 * @package Motoyomi
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit; }
wp_clear_scheduled_hook( 'motoyomi_il_batch' );
foreach ( array( 'motoyomi_il_index', 'motoyomi_il_settings', 'motoyomi_il_progress', 'motoyomi_il_meta_mode', 'motoyomi_il_updated', 'motoyomi_il_batch_lock' ) as $motoyomi_option ) {
	delete_option( $motoyomi_option ); }
delete_post_meta_by_key( '_motoyomi_il' );
