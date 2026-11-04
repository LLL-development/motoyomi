<?php
/**
 * Local Japanese matching.
 *
 * @package Motoyomi
 */

/** Local internal-link implementation. */
class Motoyomi_IL_Engine {
	/**
	 * Normalize Unicode compatibility forms, model hyphens and case.
	 *
	 * @param string $text Original text.
	 * @return string
	 */
	public static function normalize( $text ) {
		$text = Normalizer::normalize( html_entity_decode( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' ), Normalizer::FORM_KC );
		return mb_strtolower( preg_replace( '/[‐‑‒–−﹣－]/u', '-', $text ), 'UTF-8' );
	}
	/**
	 * Return a normalized model comparison string.
	 *
	 * @param string $text Original text.
	 * @return string
	 */
	public static function compact( $text ) {
		return preg_replace( '/(?<=[a-z0-9])-(?=[a-z0-9])/u', '', self::normalize( $text ) );
	}
	/**
	 * Extract at most sixty Japanese bigrams and model tokens.
	 *
	 * @param string $text Title or headings.
	 * @return array
	 */
	public static function grams( $text ) {
		$text = self::normalize( wp_strip_all_tags( $text ) );
		preg_match_all( '/[a-z0-9]+(?:-[a-z0-9]+)*|[\p{Hiragana}\p{Katakana}\p{Han}ー]+/u', $text, $runs );
		$out = array();
		foreach ( $runs[0] as $run ) {
			if ( preg_match( '/^[a-z0-9]/', $run ) ) {
				$out[] = $run;
				$out[] = str_replace( '-', '', $run );
			} else {
				$chars = preg_split( '//u', $run, -1, PREG_SPLIT_NO_EMPTY );
				for ( $i = 0, $length = count( $chars ) - 1; $i < $length; $i++ ) {
					$out[] = $chars[ $i ] . $chars[ $i + 1 ]; }
			}
		}
		return array_slice( array_values( array_unique( $out ) ), 0, 60 );
	}
	/**
	 * Extract at most twenty h2 through h4 headings.
	 *
	 * @param string $html Article HTML.
	 * @return array
	 */
	public static function headings( $html ) {
		preg_match_all( '/<h[2-4]\b[^>]*>(.*?)<\/h[2-4]>/isu', $html, $m );
		return array_slice(
			array_map(
				function ( $v ) {
					return html_entity_decode( wp_strip_all_tags( $v ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
				},
				$m[1]
			),
			0,
			20
		);
	}
	/**
	 * Weight title tokens twice as strongly as heading tokens.
	 *
	 * @param string $title Article title.
	 * @param array  $headings Plain heading strings.
	 * @return array
	 */
	public static function weighted( $title, $headings ) {
		$weights = array_fill_keys( self::grams( $title ), 2 );
		foreach ( self::grams( implode( ' ', $headings ) ) as $g ) {
			if ( ! isset( $weights[ $g ] ) ) {
				$weights[ $g ] = 1; }
		}
		return array_slice( $weights, 0, 60, true );
	}
	/**
	 * Find the longest phrase and retain its original spelling.
	 *
	 * @param string $body Current article HTML.
	 * @param array  $phrases Candidate titles and headings.
	 * @param int    $minimum Minimum phrase length.
	 * @return string|null
	 */
	public static function anchor( $body, $phrases, $minimum ) {
		static $cached_body = null;
		static $prepared    = null;
		if ( $cached_body !== $body ) {
			// Keep original graphemes so displayed anchors retain the author's spelling.
			$plain = html_entity_decode( wp_strip_all_tags( $body ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
			preg_match_all( '/\X/u', $plain, $graphemes );
			$normalized = '';
			$map        = array();
			$original   = '';
			$offset     = 0;
			foreach ( $graphemes[0] as $g ) {
				$part = self::normalize( $g );
				for ( $i = 0, $length = strlen( $part ); $i < $length; $i++ ) {
					$map[ strlen( $normalized ) + $i ] = array( $offset, strlen( $g ) ); }
				$normalized .= $part;
				$original   .= $g;
				$offset     += strlen( $g );
			}
			// Remove model hyphens while retaining mapping to original offsets.
			$compact = '';
			$cmap    = array();
			for ( $i = 0, $length = strlen( $normalized ); $i < $length; $i++ ) {
				if ( '-' === $normalized[ $i ] && $i > 0 && $i + 1 < strlen( $normalized ) && preg_match( '/[a-z0-9]/', $normalized[ $i - 1 ] ) && preg_match( '/[a-z0-9]/', $normalized[ $i + 1 ] ) ) {
					continue; }
				$cmap[ strlen( $compact ) ] = $map[ $i ];
				$compact                   .= $normalized[ $i ];
			}
			$cached_body = $body;
			$prepared    = array( $compact, $cmap, $original );
		} else {
			list( $compact, $cmap, $original ) = $prepared;
		}
		usort(
			$phrases,
			function ( $a, $b ) {
				return mb_strlen( $b ) <=> mb_strlen( $a );
			}
		);
		foreach ( $phrases as $phrase ) {
			if ( mb_strlen( self::normalize( $phrase ) ) < $minimum ) {
				continue; }
			$needle = self::compact( $phrase );
			if ( '' === $needle ) {
				continue; }
			$pos            = strpos( $compact, $needle );
			$needle_length  = strlen( $needle );
			$compact_length = strlen( $compact );
			if ( preg_match( '/^[a-z0-9]/', $needle ) ) {
				while ( false !== $pos && ( ( $pos > 0 && preg_match( '/[a-z0-9]/', $compact[ $pos - 1 ] ) ) || ( $pos + $needle_length < $compact_length && preg_match( '/[a-z0-9]/', $compact[ $pos + $needle_length ] ) ) ) ) {
					$pos = strpos( $compact, $needle, $pos + 1 );
				}
			}
			if ( false !== $pos ) {
				$start = $cmap[ $pos ][0];
				$end   = $cmap[ $pos + $needle_length - 1 ];
				return substr( $original, $start, $end[0] + $end[1] - $start );
			}
		}
		return null;
	}
	/**
	 * Return a hostless URL identity, retaining plain post permalinks.
	 *
	 * @param string $url Absolute or relative URL.
	 * @return string
	 */
	public static function path( $url ) {
		$path = rawurldecode( wp_parse_url( html_entity_decode( $url, ENT_QUOTES, 'UTF-8' ), PHP_URL_PATH ) ?? '/' );
		$path = '/' . trim( $path, '/' ) . ( trim( $path, '/' ) === '' ? '' : '/' );
		parse_str( wp_parse_url( html_entity_decode( $url, ENT_QUOTES, 'UTF-8' ), PHP_URL_QUERY ) ?? '', $query );
		foreach ( array( 'p', 'page_id', 'attachment_id' ) as $key ) {
			if ( isset( $query[ $key ] ) && is_scalar( $query[ $key ] ) ) {
				return $path . '?' . $key . '=' . (int) $query[ $key ]; }
		}
		return $path;
	}
	/**
	 * Rank local related articles and find literal internal-link phrases.
	 *
	 * @param int    $id Current post ID.
	 * @param string $title Current title.
	 * @param string $body Current editor HTML.
	 * @param array  $docs Local indexed documents.
	 * @param array  $excluded Excluded path prefixes.
	 * @param int    $related_limit Maximum related articles.
	 * @param int    $link_limit Maximum phrase suggestions.
	 * @param int    $minimum Minimum phrase length.
	 * @return array
	 */
	public static function suggest( $id, $title, $body, $docs, $excluded, $related_limit, $link_limit, $minimum ) {
		$query = self::weighted( $title, self::headings( $body ) );
		$df    = array();
		foreach ( $docs as $doc ) {
			foreach ( $doc['grams'] as $g => $w ) {
				$df[ $g ] = ( $df[ $g ] ?? 0 ) + 1; }
		}
		preg_match_all( '/<a\b[^>]*\bhref\s*=\s*["\']([^"\']+)["\']/iu', $body, $links );
		$linked  = array_map( array( self::class, 'path' ), $links[1] );
		$related = array();
		$anchors = array();
		foreach ( $docs as $doc ) {
			$path = self::path( $doc['url'] );
			$skip = (int) $doc['id'] === (int) $id || in_array( $path, $linked, true );
			foreach ( $excluded as $exclude ) {
				if ( '' !== $exclude && strpos( $path, self::path( $exclude ) ) === 0 ) {
					$skip = true; }
			}
			if ( $skip ) {
				continue; }
			$intersection = 0;
			$union        = 0;
			foreach ( array_unique( array_merge( array_keys( $query ), array_keys( $doc['grams'] ) ) ) as $g ) {
				$idf           = 1 + log( ( count( $docs ) + 1 ) / ( ( $df[ $g ] ?? 0 ) + 1 ) );
				$intersection += min( $query[ $g ] ?? 0, $doc['grams'][ $g ] ?? 0 ) * $idf;
				$union        += max( $query[ $g ] ?? 0, $doc['grams'][ $g ] ?? 0 ) * $idf;
			}
			$score = $union ? $intersection / $union : 0;
			$row   = array(
				'id'    => $doc['id'],
				'title' => $doc['title'],
				'url'   => $doc['url'],
				'level' => $score >= .5 ? 'high' : ( $score >= .2 ? 'medium' : 'low' ),
				'score' => $score,
			);
			if ( $score > 0 ) {
				$related[] = $row; }
			$anchor = self::anchor( $body, array_merge( array( $doc['title'] ), $doc['headings'] ), $minimum );
			if ( null !== $anchor ) {
				$row['anchor_text'] = $anchor;
				$anchors[]          = $row; }
		}
		usort(
			$related,
			function ( $a, $b ) {
				return ( $b['score'] === $a['score'] ) ? ( $a['id'] <=> $b['id'] ) : ( $b['score'] <=> $a['score'] );
			}
		);
		usort(
			$anchors,
			function ( $a, $b ) {
				return mb_strlen( $b['anchor_text'] ) <=> mb_strlen( $a['anchor_text'] );
			}
		);
		return array(
			'related' => array_slice( $related, 0, $related_limit ),
			'links'   => array_slice( $anchors, 0, $link_limit ),
		);
	}
}
