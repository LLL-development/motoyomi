<?php
/**
 * WordPress integration.
 *
 * @package Motoyomi
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; }
/** Local internal-link implementation. */
class Motoyomi_IL_Plugin {
	/**
	 * Return initial settings.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			'types'    => array( 'post' ),
			'excluded' => '',
			'related'  => 5,
			'links'    => 10,
			'minimum'  => 3,
		); }
	/**
	 * Read settings with defaults.
	 *
	 * @return array
	 */
	public static function settings() {
		return wp_parse_args( get_option( 'motoyomi_il_settings', array() ), self::defaults() ); }
	/**
	 * Register WordPress hooks and authenticated routes.
	 *
	 * @return void
	 */
	public static function boot() {
		add_action(
			'init',
			function () {
				// Local translations are bundled for distribution outside WordPress.org.
				load_plugin_textdomain( 'motoyomi', false, 'motoyomi/languages' ); // phpcs:ignore PluginCheck.CodeAnalysis.DiscouragedFunctions.load_plugin_textdomainFound
			}
		);
		add_action( 'wp_after_insert_post', array( self::class, 'saved' ), 10, 2 );
		add_action( 'before_delete_post', array( self::class, 'remove' ) );
		add_action( 'motoyomi_il_batch', array( self::class, 'batch' ) );
		add_action( 'rest_api_init', array( self::class, 'routes' ) );
		add_action(
			'admin_menu',
			function () {
				add_options_page( __( 'Internal links', 'motoyomi' ), __( 'Internal links', 'motoyomi' ), 'manage_options', 'motoyomi', array( self::class, 'settings_page' ) );
			}
		);
		add_action( 'admin_post_motoyomi_il_settings', array( self::class, 'save_settings' ) );
		add_action( 'admin_post_motoyomi_il_rebuild', array( self::class, 'rebuild_action' ) );
		add_action( 'add_meta_boxes', array( self::class, 'metabox' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'scripts' ) );
	}
	/**
	 * Start indexing after single-site activation.
	 *
	 * @param bool $network_wide Whether network activation was requested.
	 * @return void
	 */
	public static function activate( $network_wide = false ) {
		if ( $network_wide ) {
			wp_die( esc_html__( 'Activate Motoyomi separately on each site. Network activation is not supported.', 'motoyomi' ) ); }
		self::rebuild();
	}
	/**
	 * Read the local index from an option or post metadata.
	 *
	 * @return array
	 */
	public static function index() {
		$docs = (array) json_decode( get_option( 'motoyomi_il_index', '{}' ), true );
		if ( get_option( 'motoyomi_il_meta_mode' ) ) {
			$ids = get_posts(
				array(
					'post_type'      => array_keys( get_post_types() ),
					'post_status'    => 'any',
					'posts_per_page' => -1,
					'fields'         => 'ids',
					// The overflow index is deliberately read by its private metadata key.
					'meta_key'       => '_motoyomi_il', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				)
			);
			foreach ( $ids as $id ) {
				$doc = get_post_meta( $id, '_motoyomi_il', true );
				if ( $doc ) {
					$docs[ $id ] = $doc; }
			}
		}
		return $docs;
	}
	/**
	 * Store or delete one local index entry.
	 *
	 * @param int        $id Post ID.
	 * @param array|null $doc Entry to store; null removes it.
	 * @return void
	 */
	public static function store( $id, $doc ) {
		if ( get_option( 'motoyomi_il_meta_mode' ) ) {
			if ( $doc ) {
				update_post_meta( $id, '_motoyomi_il', $doc );
			} else {
				delete_post_meta( $id, '_motoyomi_il' ); }
			update_option( 'motoyomi_il_updated', time(), false );
			return;
		}
		$docs = self::index();
		if ( $doc ) {
			$docs[ $id ] = $doc;
		} else {
			unset( $docs[ $id ] ); }
		if ( count( $docs ) > 2000 ) {
			foreach ( $docs as $key => $value ) {
				update_post_meta( $key, '_motoyomi_il', $value ); }
			update_option( 'motoyomi_il_meta_mode', true, false );
			update_option( 'motoyomi_il_index', '{}', false );
		} else {
			update_option( 'motoyomi_il_index', wp_json_encode( $docs ), false ); }
		update_option( 'motoyomi_il_updated', time(), false );
	}
	/**
	 * Check live visibility, selected post types and exclusions.
	 *
	 * @param WP_Post|null $post Post to inspect.
	 * @return bool
	 */
	public static function eligible( $post ) {
		if ( ! $post || 'publish' !== $post->post_status || '' !== $post->post_password || ! is_post_publicly_viewable( $post ) ) {
			return false; }
		$s = self::settings();
		if ( ! in_array( $post->post_type, $s['types'], true ) ) {
			return false; }
		$path = Motoyomi_IL_Engine::path( get_permalink( $post ) );
		foreach ( preg_split( '/\R/u', $s['excluded'] ) as $exclude ) {
			if ( trim( $exclude ) !== '' && strpos( $path, Motoyomi_IL_Engine::path( trim( $exclude ) ) ) === 0 ) {
				return false; }
		}
		return true;
	}
	/**
	 * Update the index immediately after a post is saved.
	 *
	 * @param int          $id Post ID.
	 * @param WP_Post|null $post Saved post, if supplied by the hook.
	 * @return void
	 */
	public static function saved( $id, $post = null ) {
		if ( wp_is_post_revision( $id ) || wp_is_post_autosave( $id ) ) {
			return; }
		$post = $post ? $post : get_post( $id );
		if ( ! self::eligible( $post ) ) {
			self::store( $id, null );
			return; }
		$headings = Motoyomi_IL_Engine::headings( $post->post_content );
		preg_match_all( '/<a\b[^>]*href\s*=\s*["\']([^"\']+)["\']/iu', $post->post_content, $links );
		self::store(
			$id,
			array(
				'id'         => $id,
				'collection' => $post->post_type,
				'url'        => Motoyomi_IL_Engine::path( get_permalink( $id ) ),
				'title'      => get_the_title( $id ),
				'headings'   => $headings,
				'grams'      => Motoyomi_IL_Engine::weighted( $post->post_title, $headings ),
				'linked'     => array_map( array( 'Motoyomi_IL_Engine', 'path' ), $links[1] ),
				'updated_at' => gmdate( 'c' ),
			)
		);
	}
	/**
	 * Remove a deleted post from the index.
	 *
	 * @param int $id Post ID.
	 * @return void
	 */
	public static function remove( $id ) {
		self::store( $id, null ); }
	/**
	 * Reset the resumable rebuild cursor and schedule its first batch.
	 *
	 * @return void
	 */
	public static function rebuild() {
		wp_clear_scheduled_hook( 'motoyomi_il_batch' );
		update_option(
			'motoyomi_il_progress',
			array(
				'state'     => 'running',
				'cursor'    => 0,
				'processed' => 0,
				'total'     => (int) array_sum(
					array_map(
						function ( $t ) {
							return (int) wp_count_posts( $t )->publish;
						},
						self::settings()['types']
					)
				),
				'error'     => '',
			),
			false
		);
		wp_schedule_single_event( time() + 1, 'motoyomi_il_batch' );
	}
	/**
	 * Process at most fifty posts with a persistent cursor and lock.
	 *
	 * @return void
	 */
	public static function batch() {
		$state = get_option( 'motoyomi_il_progress', array() );
		if ( ( $state['state'] ?? '' ) !== 'running' ) {
			return; }
		// Atomic, expiring lock prevents overlapping cron and manual resume.
		if ( ! add_option( 'motoyomi_il_batch_lock', time(), '', 'no' ) ) {
			if ( (int) get_option( 'motoyomi_il_batch_lock' ) < time() - 120 ) {
				delete_option( 'motoyomi_il_batch_lock' ); }
			return;
		}
		try {
			global $wpdb;
			// A bounded ID cursor must see fresh rows; caching would hide concurrent edits.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$ids = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE ID > %d AND post_status = 'publish' ORDER BY ID ASC LIMIT 50", $state['cursor'] ) );
			foreach ( $ids as $id ) {
				self::saved( (int) $id );
				$state['cursor'] = (int) $id;
				++$state['processed']; }
			if ( count( $ids ) < 50 ) {
				foreach ( array_keys( self::index() ) as $id ) {
					if ( ! self::eligible( get_post( $id ) ) ) {
						self::remove( $id ); }
				}
				$state['state'] = 'complete';
			} else {
				wp_schedule_single_event( time() + 2, 'motoyomi_il_batch' ); }
			$state['updated'] = time();
			update_option( 'motoyomi_il_progress', $state, false );
		} catch ( Throwable $error ) {
			$state['state'] = 'failed';
			$state['error'] = __( 'Indexing failed. Resume to retry this batch.', 'motoyomi' );
			update_option( 'motoyomi_il_progress', $state, false );
		} finally {
			delete_option( 'motoyomi_il_batch_lock' ); }
	}
	/**
	 * Register private editor and settings REST endpoints.
	 *
	 * @return void
	 */
	public static function routes() {
		register_rest_route(
			'motoyomi/v1',
			'/related',
			array(
				'methods'             => 'POST',
				'permission_callback' => function ( $r ) {
					return current_user_can( 'edit_post', absint( $r['id'] ) );
				},
				'callback'            => array( self::class, 'related' ),
				'args'                => array(
					'id'      => array(
						'required' => true,
						'type'     => 'integer',
						'minimum'  => 1,
					),
					'title'   => array( 'type' => 'string' ),
					'content' => array( 'type' => 'string' ),
				),
			)
		);
		register_rest_route(
			'motoyomi/v1',
			'/status',
			array(
				'methods'             => 'GET',
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
				'callback'            => function () {
					return self::status();
				},
			)
		);
		register_rest_route(
			'motoyomi/v1',
			'/batch',
			array(
				'methods'             => 'POST',
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
				'callback'            => function () {
					self::batch();
					return self::status();
				},
			)
		);
	}
	/**
	 * Return local index counts and rebuild progress.
	 *
	 * @return array
	 */
	public static function status() {
		return array(
			'progress' => get_option( 'motoyomi_il_progress', array() ),
			'count'    => count( self::index() ),
			'updated'  => (int) get_option( 'motoyomi_il_updated', 0 ),
		); }
	/**
	 * Return suggestions using the current editor content.
	 *
	 * @param WP_REST_Request $request Authenticated request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function related( $request ) {
		$id   = absint( $request['id'] );
		$post = get_post( $id );
		if ( ! $post ) {
			return new WP_Error( 'not_found', __( 'Article not found.', 'motoyomi' ), array( 'status' => 404 ) ); }
		$title = mb_substr( sanitize_text_field( $request['title'] ?? $post->post_title ), 0, 2000 );
		$body  = mb_substr( wp_kses_post( $request['content'] ?? $post->post_content ), 0, 20000 );
		$docs  = self::index();
		// Always recheck current visibility; stale indexes must never disclose private posts.
		foreach ( $docs as $key => $doc ) {
			if ( ! self::eligible( get_post( $key ) ) ) {
				unset( $docs[ $key ] ); }
		}
		$s      = self::settings();
		$result = Motoyomi_IL_Engine::suggest( $id, $title, $body, $docs, preg_split( '/\R/u', $s['excluded'] ), $s['related'], $s['links'], $s['minimum'] );
		foreach ( array( 'related', 'links' ) as $type ) {
			foreach ( $result[ $type ] as &$row ) {
				$row['url'] = esc_url_raw( get_permalink( $row['id'] ) );
				unset( $row['score'] );
			} unset( $row ); }
		$result['index'] = self::status();
		return rest_ensure_response( $result );
	}
	/**
	 * Enqueue local controls only on the relevant admin screens.
	 *
	 * @param string $hook Current admin page hook.
	 * @return void
	 */
	public static function scripts( $hook ) {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php', 'settings_page_motoyomi' ), true ) ) {
			return; }
		$screen       = get_current_screen();
		$block        = $screen && $screen->is_block_editor();
		$dependencies = array( 'wp-api-fetch', 'wp-i18n' );
		if ( $block ) {
			$dependencies = array_merge( $dependencies, array( 'wp-plugins', 'wp-element', 'wp-components', 'wp-data', 'wp-editor', 'wp-edit-post', 'wp-blocks', 'wp-block-editor' ) ); }
		wp_enqueue_script( 'motoyomi-editor', plugins_url( 'assets/editor.js', __DIR__ ), $dependencies, '0.1.0', true );
		wp_localize_script(
			'motoyomi-editor',
			'motoyomiIL',
			array(
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'block'    => $block,
				'settings' => admin_url( 'options-general.php?page=motoyomi' ),
			)
		);
		wp_set_script_translations( 'motoyomi-editor', 'motoyomi', dirname( __DIR__ ) . '/languages' );
	}
	/**
	 * Register the classic editor fallback panel.
	 *
	 * @return void
	 */
	public static function metabox() {
		foreach ( self::settings()['types'] as $type ) {
			add_meta_box(
				'motoyomi-links',
				__( 'Related articles and internal links', 'motoyomi' ),
				function () {
					echo '<div id="motoyomi-classic"></div>';
				},
				$type,
				'side',
				'default',
				array( '__back_compat_meta_box' => true )
			); }
	}
	/**
	 * Require settings capability and a valid form nonce.
	 *
	 * @return void
	 */
	public static function guard() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Permission denied.', 'motoyomi' ) );
		} check_admin_referer( 'motoyomi_il' ); }
	/**
	 * Validate settings, save them and rebuild the index.
	 *
	 * @return void
	 */
	public static function save_settings() {
		self::guard();
		check_admin_referer( 'motoyomi_il' );
		$data     = isset( $_POST['motoyomi'] ) ? map_deep( (array) wp_unslash( $_POST['motoyomi'] ), 'sanitize_textarea_field' ) : array();
		$allowed  = array_keys( get_post_types( array( 'public' => true ) ) );
		$types    = array_values( array_intersect( $allowed, array_map( 'sanitize_key', (array) ( $data['types'] ?? array() ) ) ) );
		$excluded = array();
		foreach ( preg_split( '/\R/u', sanitize_textarea_field( $data['excluded'] ?? '' ) ) as $path ) {
			$path = trim( $path );
			if ( '' !== $path && substr( $path, 0, 1 ) === '/' && substr( $path, 0, 2 ) !== '//' ) {
				$excluded[] = Motoyomi_IL_Engine::path( $path ); }
		}
		update_option(
			'motoyomi_il_settings',
			array(
				'types'    => $types ? $types : array( 'post' ),
				'excluded' => implode( "\n", $excluded ),
				'related'  => min( 10, max( 1, absint( $data['related'] ?? 5 ) ) ),
				'links'    => min( 20, max( 1, absint( $data['links'] ?? 10 ) ) ),
				'minimum'  => min( 10, max( 2, absint( $data['minimum'] ?? 3 ) ) ),
			),
			false
		);
		self::rebuild();
		wp_safe_redirect( admin_url( 'options-general.php?page=motoyomi' ) );
		exit;
	}
	/**
	 * Handle an explicit rebuild or resume request.
	 *
	 * @return void
	 */
	public static function rebuild_action() {
		self::guard();
		check_admin_referer( 'motoyomi_il' );
		if ( isset( $_POST['resume'] ) ) {
			$state          = get_option( 'motoyomi_il_progress', array() );
			$state['state'] = 'running';
			$state['error'] = '';
			update_option( 'motoyomi_il_progress', $state, false );
			wp_schedule_single_event( time() + 1, 'motoyomi_il_batch' ); } else {
			self::rebuild(); }
			wp_safe_redirect( admin_url( 'options-general.php?page=motoyomi' ) );
			exit;
	}
	/**
	 * Render accessible settings and index progress controls.
	 *
	 * @return void
	 */
	public static function settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return; }
		$s = self::settings();
		?>
		<div class="wrap"><h1><?php esc_html_e( 'Internal links', 'motoyomi' ); ?></h1>
		<p><?php esc_html_e( 'This version sends nothing to external services. Suggestions compare titles and headings only. Content changes only when you explicitly add related articles.', 'motoyomi' ); ?></p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="motoyomi-settings">
		<input type="hidden" name="action" value="motoyomi_il_settings"><?php wp_nonce_field( 'motoyomi_il' ); ?>
		<fieldset><legend><strong><?php esc_html_e( 'Post types', 'motoyomi' ); ?></strong></legend>
		<?php foreach ( get_post_types( array( 'public' => true ), 'objects' ) as $type ) { ?>
		<label style="display:block"><input type="checkbox" name="motoyomi[types][]" value="<?php echo esc_attr( $type->name ); ?>" <?php checked( in_array( $type->name, $s['types'], true ) ); ?>> <?php echo esc_html( $type->label ); ?></label>
		<?php } ?></fieldset>
		<p><label for="motoyomi-excluded"><?php esc_html_e( 'Excluded paths (one path per line; includes descendants)', 'motoyomi' ); ?></label><br><textarea style="max-width:100%;box-sizing:border-box" id="motoyomi-excluded" name="motoyomi[excluded]" rows="5" cols="55" placeholder="/private/"><?php echo esc_textarea( $s['excluded'] ); ?></textarea></p>
		<?php
		foreach ( array(
			'related' => array( 1, 10, __( 'Related article limit', 'motoyomi' ) ),
			'links'   => array( 1, 20, __( 'Phrase limit', 'motoyomi' ) ),
			'minimum' => array( 2, 10, __( 'Minimum phrase length', 'motoyomi' ) ),
		) as $key => $field ) {
			?>
		<p><label for="motoyomi-<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $field[2] ); ?></label> <input id="motoyomi-<?php echo esc_attr( $key ); ?>" name="motoyomi[<?php echo esc_attr( $key ); ?>]" type="number" min="<?php echo esc_attr( $field[0] ); ?>" max="<?php echo esc_attr( $field[1] ); ?>" value="<?php echo esc_attr( $s[ $key ] ); ?>"></p>
		<?php } submit_button( __( 'Save and rebuild', 'motoyomi' ) ); ?></form>
		<h2><?php esc_html_e( 'Index status', 'motoyomi' ); ?></h2><div id="motoyomi-progress" role="status" aria-live="polite"></div>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>"><input type="hidden" name="action" value="motoyomi_il_rebuild">
		<?php
		wp_nonce_field( 'motoyomi_il' );
		submit_button( __( 'Rebuild index', 'motoyomi' ), 'secondary', 'rebuild', false );
		echo ' ';
		submit_button( __( 'Resume indexing', 'motoyomi' ), 'secondary', 'resume', false );
		?>
		</form>
		</div>
		<?php
	}
}
